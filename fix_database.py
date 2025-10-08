import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import uuid

load_dotenv()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def fix_database():
    print("🔧 Fixing database - cleaning up duplicates and recreating units...")
    
    # 1. Clean up duplicate users - keep only the latest admin and angical users
    print("Cleaning up duplicate users...")
    
    # Find the latest admin user
    admin_users = await db.users.find({"username": "admin"}).to_list(1000)
    if len(admin_users) > 1:
        # Keep the last one, delete the rest
        latest_admin = admin_users[-1]
        for user in admin_users[:-1]:
            await db.users.delete_one({"_id": user["_id"]})
        print(f"Kept latest admin user with unit_id: {latest_admin['unidade_id']}")
    else:
        latest_admin = admin_users[0] if admin_users else None
    
    # Find the latest angical user
    angical_users = await db.users.find({"username": "angical"}).to_list(1000)
    if len(angical_users) > 1:
        # Keep the last one, delete the rest
        latest_angical = angical_users[-1]
        for user in angical_users[:-1]:
            await db.users.delete_one({"_id": user["_id"]})
        print(f"Kept latest angical user with unit_id: {latest_angical['unidade_id']}")
    else:
        latest_angical = angical_users[0] if angical_users else None
    
    # Delete all other users (colab1, colab2, etc.)
    await db.users.delete_many({"username": {"$nin": ["admin", "angical"]}})
    print("Deleted duplicate collaborator users")
    
    # 2. Create the two required units
    print("Creating required units...")
    
    if latest_admin:
        main_unit = {
            "id": latest_admin["unidade_id"],
            "nome": "Farmácia Central",
            "endereco": "Rua Principal, 123 - Centro",
            "telefone": "(11) 99999-1111",
            "email": "central@farmacia.com.br",
            "cnpj": "12.345.678/0001-01",
            "responsavel": "Administrador",
            "ativa": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.unidades.insert_one(main_unit)
        print(f"Created main unit: {main_unit['nome']}")
    
    if latest_angical:
        angical_unit = {
            "id": latest_angical["unidade_id"],
            "nome": "Farmácia São Gonçalo Angical",
            "endereco": "Angical - BA",
            "telefone": "77999178367",
            "email": "amaralfarmacias@gmail.com",
            "cnpj": "12.345.678/0001-02",
            "responsavel": "Arquimedes Oliveira do Amaral",
            "ativa": True,
            "created_at": datetime.now(timezone.utc)
        }
        await db.unidades.insert_one(angical_unit)
        print(f"Created Angical unit: {angical_unit['nome']}")
    
    # 3. Verify the fix
    print("\nVerifying fix...")
    users = await db.users.find({}).to_list(1000)
    unidades = await db.unidades.find({}).to_list(1000)
    
    print(f"Users: {len(users)}")
    for user in users:
        print(f"  - {user['username']}: {user['full_name']} (unit: {user['unidade_id']})")
    
    print(f"Units: {len(unidades)}")
    for unit in unidades:
        print(f"  - {unit['id']}: {unit['nome']} - {unit['endereco']}")
        print(f"    Contact: {unit['responsavel']} - {unit['telefone']} - {unit['email']}")
    
    print("✅ Database fix completed!")

if __name__ == "__main__":
    asyncio.run(fix_database())