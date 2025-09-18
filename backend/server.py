from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import jwt
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import re
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = "farmacia_secret_key_super_secure_2024"
ALGORITHM = "HS256"

# Pydantic Models
class UserBase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    full_name: str
    role: str  # 'admin' or 'colaborador'
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str
    unidade_id: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserBase

class Produto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    codigo_barras: str
    validade: str
    preco: float
    quantidade: int
    estoque_minimo: int = 10  # Novo campo
    localizacao: str  # ex: A1, G5
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProdutoCreate(BaseModel):
    nome: str
    codigo_barras: str
    validade: str
    preco: float
    quantidade: int
    estoque_minimo: int = 10  # Novo campo
    localizacao: str

class Cliente(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    cpf: str
    telefone: str
    fiado_total: float = 0.0
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClienteCreate(BaseModel):
    nome: str
    cpf: str
    telefone: str

class ItemVenda(BaseModel):
    produto_id: str
    quantidade: int
    preco_unitario: float

class Venda(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cliente_id: Optional[str] = None
    items: List[ItemVenda]
    total: float
    metodo_pagamento: str  # dinheiro, pix, debito, credito, fiado
    valor_pago: float = 0.0
    troco: float = 0.0
    usuario_id: str
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VendaCreate(BaseModel):
    cliente_id: Optional[str] = None
    items: List[ItemVenda]
    metodo_pagamento: str
    valor_pago: float = 0.0

class Fiado(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cliente_id: str
    venda_id: str
    valor: float
    valor_pago: float = 0.0
    status: str = "pendente"  # pendente, pago_parcial, pago
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PagamentoFiado(BaseModel):
    valor: float

class NotaFiscal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    fornecedor: str
    data_emissao: str
    valor_total: float
    total_produtos: int
    lucro_potencial: float = 0.0
    status: str = "processada"  # processada, pendente, erro
    arquivo_nome: str
    produtos_extraidos: List[dict] = []
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotaFiscalCreate(BaseModel):
    numero: str
    fornecedor: str
    data_emissao: str
    valor_total: float
    produtos: List[dict]
    arquivo_nome: str

class ContaPagar(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nota_fiscal_id: str
    fornecedor: str
    valor: float
    data_vencimento: str
    status: str = "pendente"  # pendente, pago, vencido
    data_pagamento: Optional[str] = None
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProdutoCusto(BaseModel):
    produto_id: str
    preco_custo: float
    preco_venda: float
    margem_lucro: float
    data_ultima_compra: str
    fornecedor: str

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"username": username})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return UserBase(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Initialize database with default users
async def init_db():
    # Check if admin user exists
    admin_exists = await db.users.find_one({"username": "admin"})
    if not admin_exists:
        # Create default unidade
        unidade_id = str(uuid.uuid4())
        
        # Create users
        users = [
            {
                "id": str(uuid.uuid4()),
                "username": "admin",
                "password_hash": hash_password("admin123"),
                "full_name": "Administrador",
                "role": "admin",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "username": "colab1",
                "password_hash": hash_password("123456"),
                "full_name": "Colaborador 1",
                "role": "colaborador",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "username": "colab2",
                "password_hash": hash_password("123456"),
                "full_name": "Colaborador 2",
                "role": "colaborador",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "username": "colab3",
                "password_hash": hash_password("123456"),
                "full_name": "Colaborador 3",
                "role": "colaborador",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "username": "colab4",
                "password_hash": hash_password("123456"),
                "full_name": "Colaborador 4",
                "role": "colaborador",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.users.insert_many(users)
        
        # Create sample products
        produtos = [
            {
                "id": str(uuid.uuid4()),
                "nome": "Paracetamol 500mg",
                "codigo_barras": "7896333123456",
                "validade": "2025-12-31",
                "preco": 12.50,
                "quantidade": 100,
                "localizacao": "A1",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nome": "Dipirona 500mg",
                "codigo_barras": "7896333123457",
                "validade": "2025-08-15",
                "preco": 8.90,
                "quantidade": 75,
                "localizacao": "A2",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nome": "Amoxicilina 500mg",
                "codigo_barras": "7896333123458",
                "validade": "2025-03-20",
                "preco": 25.80,
                "quantidade": 50,
                "localizacao": "B1",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.produtos.insert_many(produtos)
        
        # Create sample clients
        clientes = [
            {
                "id": str(uuid.uuid4()),
                "nome": "Maria Silva",
                "cpf": "123.456.789-00",
                "telefone": "(11) 99999-1234",
                "fiado_total": 45.50,
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "nome": "João Santos",
                "cpf": "987.654.321-00",
                "telefone": "(11) 88888-5678",
                "fiado_total": 0.0,
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.clientes.insert_many(clientes)

# Authentication routes
@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    access_token = create_access_token(data={"sub": user["username"]})
    user_obj = UserBase(
        id=user["id"],
        username=user["username"],
        full_name=user["full_name"],
        role=user["role"],
        unidade_id=user["unidade_id"],
        created_at=user["created_at"]
    )
    
    return {"access_token": access_token, "token_type": "bearer", "user": user_obj}

@api_router.get("/auth/me", response_model=UserBase)
async def get_me(current_user: UserBase = Depends(get_current_user)):
    return current_user

# Products routes
@api_router.get("/produtos", response_model=List[Produto])
async def get_produtos(current_user: UserBase = Depends(get_current_user)):
    produtos = await db.produtos.find({"unidade_id": current_user.unidade_id}).to_list(1000)
    return [Produto(**produto) for produto in produtos]

@api_router.post("/produtos", response_model=Produto)
async def create_produto(produto_data: ProdutoCreate, current_user: UserBase = Depends(get_current_user)):
    produto_dict = produto_data.dict()
    produto_dict["unidade_id"] = current_user.unidade_id
    produto_obj = Produto(**produto_dict)
    await db.produtos.insert_one(produto_obj.dict())
    return produto_obj

@api_router.put("/produtos/{produto_id}", response_model=Produto)
async def update_produto(produto_id: str, produto_data: ProdutoCreate, current_user: UserBase = Depends(get_current_user)):
    produto_dict = produto_data.dict()
    produto_dict["unidade_id"] = current_user.unidade_id
    
    result = await db.produtos.update_one(
        {"id": produto_id, "unidade_id": current_user.unidade_id},
        {"$set": produto_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    updated_produto = await db.produtos.find_one({"id": produto_id})
    return Produto(**updated_produto)

@api_router.get("/produtos/buscar/{codigo}")
async def buscar_produto_por_codigo(codigo: str, current_user: UserBase = Depends(get_current_user)):
    produto = await db.produtos.find_one({
        "codigo_barras": codigo,
        "unidade_id": current_user.unidade_id
    })
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return Produto(**produto)

# Clients routes
@api_router.get("/clientes", response_model=List[Cliente])
async def get_clientes(current_user: UserBase = Depends(get_current_user)):
    clientes = await db.clientes.find({"unidade_id": current_user.unidade_id}).to_list(1000)
    return [Cliente(**cliente) for cliente in clientes]

@api_router.post("/clientes", response_model=Cliente)
async def create_cliente(cliente_data: ClienteCreate, current_user: UserBase = Depends(get_current_user)):
    cliente_dict = cliente_data.dict()
    cliente_dict["unidade_id"] = current_user.unidade_id
    cliente_obj = Cliente(**cliente_dict)
    await db.clientes.insert_one(cliente_obj.dict())
    return cliente_obj

@api_router.put("/clientes/{cliente_id}", response_model=Cliente)
async def update_cliente(cliente_id: str, cliente_data: ClienteCreate, current_user: UserBase = Depends(get_current_user)):
    cliente_dict = cliente_data.dict()
    
    result = await db.clientes.update_one(
        {"id": cliente_id, "unidade_id": current_user.unidade_id},
        {"$set": cliente_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    
    updated_cliente = await db.clientes.find_one({"id": cliente_id})
    return Cliente(**updated_cliente)

# Sales routes
@api_router.post("/vendas", response_model=Venda)
async def create_venda(venda_data: VendaCreate, current_user: UserBase = Depends(get_current_user)):
    # Calculate total
    total = sum(item.quantidade * item.preco_unitario for item in venda_data.items)
    
    venda_dict = venda_data.dict()
    venda_dict.update({
        "total": total,
        "usuario_id": current_user.id,
        "unidade_id": current_user.unidade_id,
        "troco": max(0, venda_data.valor_pago - total) if venda_data.metodo_pagamento != "fiado" else 0
    })
    
    venda_obj = Venda(**venda_dict)
    await db.vendas.insert_one(venda_obj.dict())
    
    # Update product quantities
    for item in venda_data.items:
        await db.produtos.update_one(
            {"id": item.produto_id},
            {"$inc": {"quantidade": -item.quantidade}}
        )
    
    # Handle fiado
    if venda_data.metodo_pagamento == "fiado" and venda_data.cliente_id:
        fiado_obj = Fiado(
            cliente_id=venda_data.cliente_id,
            venda_id=venda_obj.id,
            valor=total
        )
        await db.fiados.insert_one(fiado_obj.dict())
        
        # Update client fiado total
        await db.clientes.update_one(
            {"id": venda_data.cliente_id},
            {"$inc": {"fiado_total": total}}
        )
    
    return venda_obj

@api_router.get("/vendas", response_model=List[Venda])
async def get_vendas(current_user: UserBase = Depends(get_current_user)):
    vendas = await db.vendas.find({"unidade_id": current_user.unidade_id}).to_list(1000)
    return [Venda(**venda) for venda in vendas]

# Fiado routes
@api_router.get("/fiados")
async def get_fiados(current_user: UserBase = Depends(get_current_user)):
    fiados = await db.fiados.find().to_list(1000)
    result = []
    for fiado in fiados:
        cliente = await db.clientes.find_one({"id": fiado["cliente_id"]})
        if cliente and cliente["unidade_id"] == current_user.unidade_id:
            # Convert ObjectId to string and clean data
            fiado_clean = {
                "id": fiado.get("id", str(fiado.get("_id", ""))),
                "cliente_id": fiado["cliente_id"],
                "venda_id": fiado["venda_id"],
                "valor": float(fiado["valor"]),
                "valor_pago": float(fiado.get("valor_pago", 0.0)),
                "status": fiado.get("status", "pendente"),
                "created_at": fiado.get("created_at", ""),
                "cliente_nome": cliente["nome"]
            }
            result.append(fiado_clean)
    return result

@api_router.post("/fiados/{fiado_id}/pagar")
async def pagar_fiado(fiado_id: str, pagamento: PagamentoFiado, current_user: UserBase = Depends(get_current_user)):
    fiado = await db.fiados.find_one({"id": fiado_id})
    if not fiado:
        raise HTTPException(status_code=404, detail="Fiado não encontrado")
    
    novo_valor_pago = fiado["valor_pago"] + pagamento.valor
    novo_status = "pago" if novo_valor_pago >= fiado["valor"] else "pago_parcial"
    
    await db.fiados.update_one(
        {"id": fiado_id},
        {"$set": {"valor_pago": novo_valor_pago, "status": novo_status}}
    )
    
    # Update client fiado total
    await db.clientes.update_one(
        {"id": fiado["cliente_id"]},
        {"$inc": {"fiado_total": -pagamento.valor}}
    )
    
    return {"message": "Pagamento registrado com sucesso"}

# Dashboard routes
@api_router.get("/dashboard/vendas-periodo")
async def get_vendas_periodo(
    data_inicio: str,
    data_fim: str,
    current_user: UserBase = Depends(get_current_user)
):
    try:
        # Parse dates safely
        start_date = datetime.fromisoformat(data_inicio.replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data_fim.replace('Z', '+00:00'))
        
        # Find sales in the period
        vendas = await db.vendas.find({
            "unidade_id": current_user.unidade_id,
            "created_at": {
                "$gte": start_date,
                "$lte": end_date
            }
        }).to_list(1000)
        
        # Clean and calculate totals
        vendas_clean = []
        total_vendas = 0.0
        
        for venda in vendas:
            venda_clean = {
                "id": venda.get("id", str(venda.get("_id", ""))),
                "total": float(venda["total"]),
                "metodo_pagamento": venda["metodo_pagamento"],
                "created_at": venda.get("created_at", "")
            }
            vendas_clean.append(venda_clean)
            total_vendas += float(venda["total"])
        
        return {
            "total_vendas": total_vendas,
            "quantidade_vendas": len(vendas_clean),
            "vendas": vendas_clean
        }
    except Exception as e:
        print(f"Error in vendas-periodo: {e}")
        return {
            "total_vendas": 0.0,
            "quantidade_vendas": 0,
            "vendas": []
        }

@api_router.get("/dashboard/produtos-validade")
async def get_produtos_validade_proxima(current_user: UserBase = Depends(get_current_user)):
    # Products expiring in next 3 months
    data_limite = datetime.now() + timedelta(days=90)
    produtos = await db.produtos.find({
        "unidade_id": current_user.unidade_id
    }).to_list(1000)
    
    produtos_vencendo = []
    for produto in produtos:
        try:
            validade = datetime.fromisoformat(produto["validade"])
            if validade <= data_limite:
                # Clean the product data to avoid ObjectId issues
                produto_clean = {
                    "id": produto.get("id", str(produto.get("_id", ""))),
                    "nome": produto["nome"],
                    "codigo_barras": produto["codigo_barras"],
                    "validade": produto["validade"],
                    "preco": float(produto["preco"]),
                    "quantidade": int(produto["quantidade"]),
                    "estoque_minimo": int(produto.get("estoque_minimo", 10)),
                    "localizacao": produto["localizacao"],
                    "created_at": produto.get("created_at", "")
                }
                produtos_vencendo.append(produto_clean)
        except Exception as e:
            print(f"Error processing product {produto.get('nome', 'unknown')}: {e}")
            continue
    
    return produtos_vencendo

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: UserBase = Depends(get_current_user)):
    """Retorna estatísticas gerais do dashboard"""
    # Contar produtos
    total_produtos = await db.produtos.count_documents({"unidade_id": current_user.unidade_id})
    
    # Contar clientes
    total_clientes = await db.clientes.count_documents({"unidade_id": current_user.unidade_id})
    
    # Produtos com estoque baixo (quantidade <= estoque_minimo)
    produtos = await db.produtos.find({"unidade_id": current_user.unidade_id}).to_list(1000)
    produtos_estoque_baixo = []
    for produto in produtos:
        estoque_minimo = produto.get("estoque_minimo", 10)
        if produto["quantidade"] <= estoque_minimo:
            produtos_estoque_baixo.append({
                "id": produto.get("id", str(produto.get("_id", ""))),
                "nome": produto["nome"],
                "quantidade": produto["quantidade"],
                "estoque_minimo": estoque_minimo,
                "localizacao": produto["localizacao"]
            })
    
    # Total de fiados pendentes
    fiados_pendentes = await db.fiados.count_documents({
        "status": {"$ne": "pago"}
    })
    
    return {
        "total_produtos": total_produtos,
        "total_clientes": total_clientes,
        "produtos_estoque_baixo": len(produtos_estoque_baixo),
        "produtos_estoque_baixo_detalhes": produtos_estoque_baixo,
        "fiados_pendentes": fiados_pendentes
    }

# User management routes (Admin only)
@api_router.get("/usuarios", response_model=List[UserBase])
async def get_usuarios(current_user: UserBase = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    users = await db.users.find({"unidade_id": current_user.unidade_id}).to_list(1000)
    result = []
    for user_doc in users:
        user_obj = UserBase(**user_doc)
        # Para fins administrativos, incluir uma representação da senha (não recomendado em produção real)
        user_dict = user_obj.dict()
        user_dict["senha_display"] = "admin123" if user_doc["username"] == "admin" else "123456"
        result.append(user_dict)
    return result

@api_router.post("/usuarios", response_model=UserBase)
async def create_usuario(user_data: UserCreate, current_user: UserBase = Depends(get_current_user)):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Nome de usuário já existe")
    
    user_dict = user_data.dict()
    user_dict["password_hash"] = hash_password(user_dict.pop("password"))
    user_dict["unidade_id"] = current_user.unidade_id
    user_obj = UserBase(**user_dict)
    
    await db.users.insert_one({**user_obj.dict(), "password_hash": user_dict["password_hash"]})
    return user_obj

@api_router.put("/usuarios/{user_id}/senha")
async def alterar_senha_usuario(user_id: str, senha_data: dict, current_user: UserBase = Depends(get_current_user)):
    # Admin can change any password, user can change own password
    if current_user.role != 'admin' and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    nova_senha = senha_data.get("nova_senha")
    if not nova_senha or len(nova_senha) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")
    
    password_hash = hash_password(nova_senha)
    result = await db.users.update_one(
        {"id": user_id, "unidade_id": current_user.unidade_id},
        {"$set": {"password_hash": password_hash}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    return {"message": "Senha alterada com sucesso"}
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_db()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()