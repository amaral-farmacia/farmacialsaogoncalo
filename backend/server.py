from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
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
    preco_custo: float = 0.0
    quantidade: int
    estoque_minimo: int = 10
    localizacao: str  # ex: A1, G5
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProdutoCreate(BaseModel):
    nome: str
    codigo_barras: str
    validade: str
    preco: float
    preco_custo: float = 0.0
    quantidade: int
    estoque_minimo: int = 10
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

class Boleto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    fornecedor: str
    valor: float
    data_vencimento: str
    descricao: str = ""
    categoria: str = "medicamentos"
    numero_boleto: str = ""
    codigo_barras: str = ""
    status: str = "pendente"  # pendente, pago, vencido
    data_pagamento: Optional[str] = None
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BoletoCreate(BaseModel):
    fornecedor: str
    valor: float
    data_vencimento: str
    descricao: str = ""
    categoria: str = "medicamentos"
    numero_boleto: str = ""
    codigo_barras: str = ""

class PagamentoBoleto(BaseModel):
    data_pagamento: str
    valor_pago: float

class EntradaMercadoria(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    produto_id: str
    quantidade: int
    preco_custo: float
    preco_venda: float
    data_validade: str = ""
    lote: str = ""
    fornecedor: str = ""
    localizacao: str = ""
    valor_total_custo: float = 0.0
    valor_total_venda: float = 0.0
    lucro_unitario: float = 0.0
    margem_lucro: float = 0.0
    usuario_id: str
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EntradaMercadoriaCreate(BaseModel):
    produto_id: str
    quantidade: int
    preco_custo: float
    preco_venda: float
    data_validade: str = ""
    lote: str = ""
    fornecedor: str = ""
    localizacao: str = ""

class NotaFiscal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    numero: str
    serie: str
    fornecedor_nome: str
    fornecedor_cnpj: str
    data_emissao: str
    data_recebimento: str = ""
    valor_total: float
    valor_produtos: float
    valor_servicos: float = 0.0
    valor_desconto: float = 0.0
    valor_frete: float = 0.0
    icms_total: float = 0.0
    ipi_total: float = 0.0
    status: str = "recebida"  # recebida, processada, erro
    arquivo_xml: str = ""  # path do arquivo
    produtos: list = []
    observacoes: str = ""
    usuario_id: str
    unidade_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotaFiscalCreate(BaseModel):
    numero: str
    serie: str
    fornecedor_nome: str
    fornecedor_cnpj: str
    data_emissao: str
    valor_total: float
    valor_produtos: float
    valor_servicos: float = 0.0
    valor_desconto: float = 0.0
    valor_frete: float = 0.0
    icms_total: float = 0.0
    ipi_total: float = 0.0
    produtos: list = []
    observacoes: str = ""

class Unidade(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome: str
    endereco: str
    telefone: str
    email: str = ""
    cnpj: str = ""
    responsavel: str = ""
    ativa: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UnidadeCreate(BaseModel):
    nome: str
    endereco: str
    telefone: str
    email: str = ""
    cnpj: str = ""
    responsavel: str = ""
    ativa: bool = True

class TransferenciaProduto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    produto_id: str
    unidade_origem_id: str
    unidade_destino_id: str
    quantidade: int
    status: str = "pendente"  # pendente, em_transito, confirmada, cancelada
    observacoes: str = ""
    usuario_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransferenciaCreate(BaseModel):
    produto_id: str
    unidade_destino_id: str
    quantidade: int
    observacoes: str = ""

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
    print("🔍 Initializing database...")
    
    # Check if admin user exists
    admin_exists = await db.users.find_one({"username": "admin"})
    print(f"Admin user exists: {admin_exists is not None}")
    
    # Verificar se usuário angical existe (para forçar reinicialização se necessário)
    angical_exists = await db.users.find_one({"username": "angical"})
    print(f"Angical user exists: {angical_exists is not None}")
    
    # If angical user doesn't exist, create it along with its unit
    if not angical_exists:
        # Create segunda unidade - São Gonçalo do Angical
        unidade_angical_id = str(uuid.uuid4())
        
        # Create angical user
        angical_user = {
            "id": str(uuid.uuid4()),
            "username": "angical",
            "password_hash": hash_password("angical123"),
            "full_name": "Colaborador Angical",
            "role": "colaborador",
            "unidade_id": unidade_angical_id,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.insert_one(angical_user)
        
        # Create angical unit
        angical_unit = {
            "id": unidade_angical_id,
            "nome": "Farmácia São Gonçalo do Angical",
            "endereco": "Rua Central, 456 - Centro, São Gonçalo do Angical - BA",
            "telefone": "(77) 99999-2222",
            "email": "angical@farmaciasaogoncalo.com.br",
            "cnpj": "12.345.678/0001-02",
            "responsavel": "Ana Paula Santos",
            "ativa": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.unidades.insert_one(angical_unit)
        
        print("✅ Angical user and unit created successfully")
    
    if not admin_exists:
        # Create default unidade
        unidade_id = str(uuid.uuid4())
        
        # Create segunda unidade - São Gonçalo do Angical
        unidade_angical_id = str(uuid.uuid4())
        
        # Create users (including angical user)
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
            },
            {
                "id": str(uuid.uuid4()),
                "username": "angical",
                "password_hash": hash_password("angical123"),
                "full_name": "Colaborador Angical",
                "role": "colaborador",
                "unidade_id": unidade_angical_id,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.users.insert_many(users)
        
        # Create sample products with cost prices
        produtos = [
            {
                "id": str(uuid.uuid4()),
                "nome": "Paracetamol 500mg",
                "codigo_barras": "7896333123456",
                "validade": "2025-12-31",
                "preco": 12.50,
                "preco_custo": 8.20,
                "quantidade": 100,
                "estoque_minimo": 20,
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
                "preco_custo": 6.10,
                "quantidade": 75,
                "estoque_minimo": 15,
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
                "preco_custo": 18.50,
                "quantidade": 8,
                "estoque_minimo": 10,
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

        # Create sample boletos
        boletos = [
            {
                "id": str(uuid.uuid4()),
                "fornecedor": "Cimed",
                "valor": 1000.00,
                "data_vencimento": "2025-09-25",
                "descricao": "Compra de medicamentos - NF 12345",
                "categoria": "medicamentos",
                "numero_boleto": "123456789",
                "status": "pendente",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "fornecedor": "Boticário",
                "valor": 500.00,
                "data_vencimento": "2025-09-15",
                "descricao": "Material de higiene e cosméticos",
                "categoria": "material",
                "numero_boleto": "987654321",
                "status": "vencido",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "fornecedor": "Distribuidora São Paulo",
                "valor": 2500.00,
                "data_vencimento": "2025-09-10",
                "descricao": "Medicamentos diversos",
                "categoria": "medicamentos", 
                "numero_boleto": "456789123",
                "status": "pago",
                "data_pagamento": "2025-09-10",
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.boletos.insert_many(boletos)
        
        # Create sample notas fiscais
        notas_fiscais = [
            {
                "id": str(uuid.uuid4()),
                "numero": "000123456",
                "serie": "001",
                "fornecedor_nome": "DISTRIBUIDORA EXEMPLO LTDA",
                "fornecedor_cnpj": "12.345.678/0001-90",
                "data_emissao": "2025-01-15",
                "data_recebimento": "2025-01-16",
                "valor_total": 1500.75,
                "valor_produtos": 1350.00,
                "valor_servicos": 0.0,
                "valor_desconto": 25.00,
                "valor_frete": 50.00,
                "icms_total": 125.75,
                "ipi_total": 0.0,
                "status": "processada",
                "produtos": [
                    {
                        "codigo": "123456",
                        "nome": "Paracetamol 500mg",
                        "quantidade": 100,
                        "valor_unitario": 2.50,
                        "valor_total": 250.00
                    },
                    {
                        "codigo": "789012",
                        "nome": "Dipirona 500mg",
                        "quantidade": 200,
                        "valor_unitario": 1.80,
                        "valor_total": 360.00
                    }
                ],
                "observacoes": "NFe recebida e processada automaticamente",
                "usuario_id": users[0]["id"],
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "numero": "000789012",
                "serie": "001",
                "fornecedor_nome": "FARMACEUTICA SAO PAULO LTDA",
                "fornecedor_cnpj": "98.765.432/0001-10",
                "data_emissao": "2025-01-10",
                "data_recebimento": "2025-01-11",
                "valor_total": 2350.50,
                "valor_produtos": 2200.00,
                "valor_servicos": 0.0,
                "valor_desconto": 0.0,
                "valor_frete": 150.50,
                "icms_total": 264.00,
                "ipi_total": 44.00,
                "status": "processada",
                "produtos": [
                    {
                        "codigo": "456789",
                        "nome": "Ibuprofeno 600mg",
                        "quantidade": 150,
                        "valor_unitario": 3.20,
                        "valor_total": 480.00
                    },
                    {
                        "codigo": "321654",
                        "nome": "Amoxicilina 500mg",
                        "quantidade": 80,
                        "valor_unitario": 4.50,
                        "valor_total": 360.00
                    }
                ],
                "observacoes": "Medicamentos controlados inclusos",
                "usuario_id": users[0]["id"],
                "unidade_id": unidade_id,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.notas_fiscais.insert_many(notas_fiscais)
        
        # Create unidades (main unit and angical unit)
        unidades = [
            {
                "id": unidade_id,
                "nome": "Farmácia Central",
                "endereco": "Rua Principal, 123 - Centro",
                "telefone": "(11) 99999-1111",
                "email": "central@farmacia.com.br",
                "cnpj": "12.345.678/0001-01",
                "responsavel": "Administrador",
                "ativa": True,
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": unidade_angical_id,
                "nome": "Farmácia São Gonçalo do Angical",
                "endereco": "Rua Central, 456 - Centro, São Gonçalo do Angical - BA",
                "telefone": "(77) 99999-2222",
                "email": "angical@farmaciasaogoncalo.com.br",
                "cnpj": "12.345.678/0001-02",
                "responsavel": "Ana Paula Santos",
                "ativa": True,
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.unidades.insert_many(unidades)
        
        # Create sample transferências
        transferencias = [
            {
                "id": str(uuid.uuid4()),
                "produto_id": produtos[0]["id"],  # Paracetamol
                "unidade_origem_id": unidade_id,
                "unidade_destino_id": unidade_angical_id,
                "quantidade": 50,
                "status": "pendente",
                "observacoes": "Transferência de estoque excedente",
                "usuario_id": users[0]["id"],
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "produto_id": produtos[1]["id"],  # Dipirona
                "unidade_origem_id": unidade_id,
                "unidade_destino_id": unidade_angical_id,
                "quantidade": 30,
                "status": "confirmada",
                "observacoes": "Reposição de estoque",
                "usuario_id": users[0]["id"],
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        await db.transferencias.insert_many(transferencias)

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

# Boletos routes
@api_router.get("/boletos")
async def get_boletos(current_user: UserBase = Depends(get_current_user)):
    """Lista todos os boletos da unidade"""
    boletos = await db.boletos.find({"unidade_id": current_user.unidade_id}).to_list(1000)
    result = []
    for boleto in boletos:
        # Determinar status baseado na data
        hoje = datetime.now().date()
        vencimento = datetime.fromisoformat(boleto["data_vencimento"]).date()
        status = boleto.get("status", "pendente")
        
        if status == "pendente" and vencimento < hoje:
            status = "vencido"
            # Atualizar no banco
            await db.boletos.update_one(
                {"id": boleto["id"]},
                {"$set": {"status": "vencido"}}
            )
        
        boleto_clean = {
            "id": boleto.get("id", str(boleto.get("_id", ""))),
            "fornecedor": boleto["fornecedor"],
            "valor": float(boleto["valor"]),
            "data_vencimento": boleto["data_vencimento"],
            "descricao": boleto.get("descricao", ""),
            "categoria": boleto.get("categoria", "medicamentos"),
            "numero_boleto": boleto.get("numero_boleto", ""),
            "status": status,
            "data_pagamento": boleto.get("data_pagamento"),
            "created_at": boleto.get("created_at", "")
        }
        result.append(boleto_clean)
    
    return result

@api_router.post("/boletos", response_model=Boleto)
async def create_boleto(boleto_data: BoletoCreate, current_user: UserBase = Depends(get_current_user)):
    """Cria um novo boleto"""
    boleto_dict = boleto_data.dict()
    boleto_dict["unidade_id"] = current_user.unidade_id
    boleto_obj = Boleto(**boleto_dict)
    await db.boletos.insert_one(boleto_obj.dict())
    return boleto_obj

@api_router.put("/boletos/{boleto_id}/pagar")
async def pagar_boleto(boleto_id: str, pagamento: PagamentoBoleto, current_user: UserBase = Depends(get_current_user)):
    """Marca um boleto como pago"""
    result = await db.boletos.update_one(
        {"id": boleto_id, "unidade_id": current_user.unidade_id},
        {"$set": {
            "status": "pago",
            "data_pagamento": pagamento.data_pagamento
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Boleto não encontrado")
    
    return {"message": "Boleto marcado como pago"}

@api_router.put("/boletos/{boleto_id}", response_model=Boleto)
async def update_boleto(boleto_id: str, boleto_data: BoletoCreate, current_user: UserBase = Depends(get_current_user)):
    """Edita um boleto existente"""
    boleto_dict = boleto_data.dict()
    
    result = await db.boletos.update_one(
        {"id": boleto_id, "unidade_id": current_user.unidade_id},
        {"$set": boleto_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Boleto não encontrado")
    
    updated_boleto = await db.boletos.find_one({"id": boleto_id})
    return Boleto(**updated_boleto)

@api_router.delete("/boletos/{boleto_id}")
async def delete_boleto(boleto_id: str, current_user: UserBase = Depends(get_current_user)):
    """Deleta um boleto"""
    result = await db.boletos.delete_one({
        "id": boleto_id, 
        "unidade_id": current_user.unidade_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Boleto não encontrado")
    
    return {"message": "Boleto deletado com sucesso"}

# Fechamento de Caixa routes
@api_router.get("/caixa/fechamento/{data}")
async def get_fechamento_caixa(data: str, current_user: UserBase = Depends(get_current_user)):
    """Retorna o fechamento de caixa para uma data específica"""
    try:
        start_date = datetime.fromisoformat(data + 'T00:00:00')
        end_date = datetime.fromisoformat(data + 'T23:59:59')
        
        # Buscar vendas do dia
        vendas = await db.vendas.find({
            "unidade_id": current_user.unidade_id,
            "created_at": {
                "$gte": start_date,
                "$lte": end_date
            }
        }).to_list(1000)
        
        # Buscar pagamentos de boletos do dia
        boletos_pagos = await db.boletos.find({
            "unidade_id": current_user.unidade_id,
            "data_pagamento": data,
            "status": "pago"
        }).to_list(1000)
        
        # Agrupar recebimentos por método
        recebimentos = {
            "dinheiro": 0.0,
            "pix": 0.0,
            "debito": 0.0,
            "credito": 0.0,
            "fiado": 0.0
        }
        
        for venda in vendas:
            metodo = venda["metodo_pagamento"]
            if metodo in recebimentos:
                recebimentos[metodo] += float(venda["total"])
        
        # Agrupar pagamentos por fornecedor
        pagamentos = {}
        for boleto in boletos_pagos:
            fornecedor = boleto["fornecedor"]
            if fornecedor not in pagamentos:
                pagamentos[fornecedor] = 0.0
            pagamentos[fornecedor] += float(boleto["valor"])
        
        total_recebimentos = sum(recebimentos.values())
        total_pagamentos = sum(pagamentos.values())
        saldo_dia = total_recebimentos - total_pagamentos
        
        return {
            "data": data,
            "recebimentos": recebimentos,
            "pagamentos": pagamentos,
            "total_recebimentos": total_recebimentos,
            "total_pagamentos": total_pagamentos,
            "saldo_dia": saldo_dia,
            "total_vendas": len(vendas),
            "total_boletos_pagos": len(boletos_pagos)
        }
        
    except Exception as e:
        return {
            "data": data,
            "recebimentos": {"dinheiro": 0, "pix": 0, "debito": 0, "credito": 0, "fiado": 0},
            "pagamentos": {},
            "total_recebimentos": 0,
            "total_pagamentos": 0,
            "saldo_dia": 0,
            "total_vendas": 0,
            "total_boletos_pagos": 0
        }

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
    
    # Boletos por status
    boletos = await db.boletos.find({"unidade_id": current_user.unidade_id}).to_list(1000)
    hoje = datetime.now().date()
    
    boletos_vencidos = []
    boletos_a_pagar = []
    
    for boleto in boletos:
        vencimento = datetime.fromisoformat(boleto["data_vencimento"]).date()
        if boleto.get("status") != "pago":
            if vencimento < hoje:
                boletos_vencidos.append({
                    "id": boleto.get("id"),
                    "fornecedor": boleto["fornecedor"],
                    "valor": boleto["valor"],
                    "data_vencimento": boleto["data_vencimento"]
                })
            else:
                boletos_a_pagar.append({
                    "id": boleto.get("id"),
                    "fornecedor": boleto["fornecedor"],
                    "valor": boleto["valor"],
                    "data_vencimento": boleto["data_vencimento"]
                })
    
    return {
        "total_produtos": total_produtos,
        "total_clientes": total_clientes,
        "produtos_estoque_baixo": len(produtos_estoque_baixo),
        "produtos_estoque_baixo_detalhes": produtos_estoque_baixo,
        "fiados_pendentes": fiados_pendentes,
        "boletos_vencidos": len(boletos_vencidos),
        "boletos_vencidos_detalhes": boletos_vencidos,
        "boletos_a_pagar": len(boletos_a_pagar),
        "boletos_a_pagar_valor": sum(b["valor"] for b in boletos_a_pagar)
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

# Entrada de Mercadorias routes
@api_router.get("/entradas")
async def get_entradas_mercadorias(current_user: UserBase = Depends(get_current_user)):
    """Lista todas as entradas de mercadorias"""
    entradas = await db.entradas_mercadorias.find({"unidade_id": current_user.unidade_id}).to_list(1000)
    result = []
    for entrada in entradas:
        # Buscar dados do produto
        produto = await db.produtos.find_one({"id": entrada["produto_id"]})
        
        entrada_clean = {
            "id": entrada.get("id", str(entrada.get("_id", ""))),
            "produto_id": entrada["produto_id"],
            "produto_nome": produto["nome"] if produto else "Produto não encontrado",
            "quantidade": entrada["quantidade"],
            "preco_custo": float(entrada["preco_custo"]),
            "preco_venda": float(entrada["preco_venda"]),
            "valor_total_custo": float(entrada["valor_total_custo"]),
            "valor_total_venda": float(entrada["valor_total_venda"]),
            "lucro_unitario": float(entrada["lucro_unitario"]),
            "margem_lucro": float(entrada["margem_lucro"]),
            "data_validade": entrada.get("data_validade", ""),
            "lote": entrada.get("lote", ""),
            "fornecedor": entrada.get("fornecedor", ""),
            "localizacao": entrada.get("localizacao", ""),
            "created_at": entrada.get("created_at", "")
        }
        result.append(entrada_clean)
    
    return result

@api_router.post("/entradas", response_model=EntradaMercadoria)
async def create_entrada_mercadoria(entrada_data: EntradaMercadoriaCreate, current_user: UserBase = Depends(get_current_user)):
    """Registra uma nova entrada de mercadoria"""
    # Calcular valores
    valor_total_custo = entrada_data.quantidade * entrada_data.preco_custo
    valor_total_venda = entrada_data.quantidade * entrada_data.preco_venda
    lucro_unitario = entrada_data.preco_venda - entrada_data.preco_custo
    margem_lucro = (lucro_unitario / entrada_data.preco_custo) * 100 if entrada_data.preco_custo > 0 else 0
    
    entrada_dict = entrada_data.dict()
    entrada_dict.update({
        "valor_total_custo": valor_total_custo,
        "valor_total_venda": valor_total_venda,
        "lucro_unitario": lucro_unitario,
        "margem_lucro": margem_lucro,
        "usuario_id": current_user.id,
        "unidade_id": current_user.unidade_id
    })
    
    entrada_obj = EntradaMercadoria(**entrada_dict)
    await db.entradas_mercadorias.insert_one(entrada_obj.dict())
    
    # Atualizar o produto com os novos preços e quantidade
    await db.produtos.update_one(
        {"id": entrada_data.produto_id, "unidade_id": current_user.unidade_id},
        {
            "$inc": {"quantidade": entrada_data.quantidade},
            "$set": {
                "preco_custo": entrada_data.preco_custo,
                "preco": entrada_data.preco_venda,
                "localizacao": entrada_data.localizacao or None
            }
        }
    )
    
    return entrada_obj

@api_router.get("/entradas/relatorio")
async def get_relatorio_entradas(
    data_inicio: str = None,
    data_fim: str = None,
    current_user: UserBase = Depends(get_current_user)
):
    """Relatório de entradas de mercadorias por período"""
    filtros = {"unidade_id": current_user.unidade_id}
    
    # Adicionar filtro de data se fornecido
    if data_inicio and data_fim:
        try:
            start_date = datetime.fromisoformat(data_inicio.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(data_fim.replace('Z', '+00:00'))
            filtros["created_at"] = {
                "$gte": start_date,
                "$lte": end_date
            }
        except:
            pass
    
    entradas = await db.entradas_mercadorias.find(filtros).to_list(1000)
    
    # Calcular totais
    total_custo = sum(entrada["valor_total_custo"] for entrada in entradas)
    total_venda = sum(entrada["valor_total_venda"] for entrada in entradas)
    total_lucro = total_venda - total_custo
    margem_media = (total_lucro / total_custo) * 100 if total_custo > 0 else 0
    
    # Agrupar por fornecedor
    fornecedores = {}
    for entrada in entradas:
        fornecedor = entrada.get("fornecedor", "Não informado")
        if fornecedor not in fornecedores:
            fornecedores[fornecedor] = {
                "total_custo": 0,
                "total_venda": 0,
                "quantidade_entradas": 0
            }
        fornecedores[fornecedor]["total_custo"] += entrada["valor_total_custo"]
        fornecedores[fornecedor]["total_venda"] += entrada["valor_total_venda"]
        fornecedores[fornecedor]["quantidade_entradas"] += 1
    
    # Clean entradas data to avoid ObjectId issues
    entradas_clean = []
    for entrada in entradas[:50]:  # Limitar a 50 para performance
        entrada_clean = {
            "id": entrada.get("id", str(entrada.get("_id", ""))),
            "produto_id": entrada["produto_id"],
            "quantidade": entrada["quantidade"],
            "preco_custo": float(entrada["preco_custo"]),
            "preco_venda": float(entrada["preco_venda"]),
            "valor_total_custo": float(entrada["valor_total_custo"]),
            "valor_total_venda": float(entrada["valor_total_venda"]),
            "lucro_unitario": float(entrada["lucro_unitario"]),
            "margem_lucro": float(entrada["margem_lucro"]),
            "data_validade": entrada.get("data_validade", ""),
            "lote": entrada.get("lote", ""),
            "fornecedor": entrada.get("fornecedor", ""),
            "localizacao": entrada.get("localizacao", ""),
            "created_at": entrada.get("created_at", "")
        }
        entradas_clean.append(entrada_clean)

    return {
        "periodo": {
            "data_inicio": data_inicio,
            "data_fim": data_fim
        },
        "totais": {
            "total_entradas": len(entradas),
            "total_custo": total_custo,
            "total_venda": total_venda,
            "total_lucro": total_lucro,
            "margem_media": margem_media
        },
        "fornecedores": fornecedores,
        "entradas": entradas_clean
    }

# Notas Fiscais routes
@api_router.get("/notas-fiscais")
async def get_notas_fiscais(current_user: UserBase = Depends(get_current_user)):
    """Lista todas as notas fiscais"""
    notas = await db.notas_fiscais.find({"unidade_id": current_user.unidade_id}).to_list(1000)
    result = []
    for nota in notas:
        nota_clean = {
            "id": nota.get("id", str(nota.get("_id", ""))),
            "numero": nota["numero"],
            "serie": nota["serie"],
            "fornecedor_nome": nota["fornecedor_nome"],
            "fornecedor_cnpj": nota["fornecedor_cnpj"],
            "data_emissao": nota["data_emissao"],
            "data_recebimento": nota.get("data_recebimento", ""),
            "valor_total": float(nota["valor_total"]),
            "valor_produtos": float(nota["valor_produtos"]),
            "valor_servicos": float(nota.get("valor_servicos", 0)),
            "valor_desconto": float(nota.get("valor_desconto", 0)),
            "valor_frete": float(nota.get("valor_frete", 0)),
            "icms_total": float(nota.get("icms_total", 0)),
            "ipi_total": float(nota.get("ipi_total", 0)),
            "status": nota.get("status", "recebida"),
            "produtos": nota.get("produtos", []),
            "observacoes": nota.get("observacoes", ""),
            "created_at": nota.get("created_at", "")
        }
        result.append(nota_clean)
    
    return result

@api_router.post("/notas-fiscais", response_model=NotaFiscal)
async def create_nota_fiscal(nota_data: NotaFiscalCreate, current_user: UserBase = Depends(get_current_user)):
    """Registra uma nova nota fiscal"""
    nota_dict = nota_data.dict()
    nota_dict.update({
        "usuario_id": current_user.id,
        "unidade_id": current_user.unidade_id,
        "data_recebimento": datetime.now().strftime('%Y-%m-%d'),
        "status": "processada"
    })
    
    nota_obj = NotaFiscal(**nota_dict)
    await db.notas_fiscais.insert_one(nota_obj.dict())
    
    return nota_obj

@api_router.post("/notas-fiscais/upload-xml")
async def upload_xml_nfe(current_user: UserBase = Depends(get_current_user)):
    """Simula o upload e processamento de XML da NFe"""
    # Esta é uma simulação - em produção seria necessário implementar
    # processamento real de XML, OCR, integração com SEFAZ, etc.
    
    # Retorna dados mockados para demonstração
    return {
        "status": "success",
        "dados_extraidos": {
            "numero": "000123456",
            "serie": "001",
            "fornecedor_nome": "Distribuidora Exemplo LTDA",
            "fornecedor_cnpj": "12.345.678/0001-90",
            "data_emissao": "2024-01-15",
            "valor_total": 1500.75,
            "valor_produtos": 1350.00,
            "valor_frete": 50.00,
            "valor_desconto": 25.00,
            "icms_total": 125.75,
            "produtos": [
                {
                    "codigo": "123456",
                    "nome": "Paracetamol 500mg",
                    "quantidade": 100,
                    "valor_unitario": 2.50,
                    "valor_total": 250.00
                },
                {
                    "codigo": "789012",
                    "nome": "Dipirona 500mg",
                    "quantidade": 200,
                    "valor_unitario": 1.80,
                    "valor_total": 360.00
                }
            ]
        },
        "message": "XML processado com sucesso"
    }

@api_router.get("/notas-fiscais/relatorio")
async def get_relatorio_nfe(
    data_inicio: str = None,
    data_fim: str = None,
    current_user: UserBase = Depends(get_current_user)
):
    """Relatório de notas fiscais por período"""
    filtros = {"unidade_id": current_user.unidade_id}
    
    # Adicionar filtro de data se fornecido
    if data_inicio and data_fim:
        try:
            start_date = datetime.fromisoformat(data_inicio.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(data_fim.replace('Z', '+00:00'))
            filtros["created_at"] = {
                "$gte": start_date,
                "$lte": end_date
            }
        except:
            pass
    
    notas = await db.notas_fiscais.find(filtros).to_list(1000)
    
    # Calcular totais
    total_notas = len(notas)
    valor_total_geral = sum(nota["valor_total"] for nota in notas)
    valor_produtos_geral = sum(nota["valor_produtos"] for nota in notas)
    valor_impostos_geral = sum(nota.get("icms_total", 0) + nota.get("ipi_total", 0) for nota in notas)
    
    # Agrupar por fornecedor
    fornecedores = {}
    for nota in notas:
        fornecedor = nota["fornecedor_nome"]
        if fornecedor not in fornecedores:
            fornecedores[fornecedor] = {
                "total_notas": 0,
                "valor_total": 0,
                "cnpj": nota["fornecedor_cnpj"]
            }
        fornecedores[fornecedor]["total_notas"] += 1
        fornecedores[fornecedor]["valor_total"] += nota["valor_total"]
    
    # Clean notas data to avoid ObjectId issues
    notas_clean = []
    for nota in notas[:50]:  # Limitar a 50 para performance
        nota_clean = {
            "id": nota.get("id", str(nota.get("_id", ""))),
            "numero": nota["numero"],
            "serie": nota["serie"],
            "fornecedor_nome": nota["fornecedor_nome"],
            "fornecedor_cnpj": nota["fornecedor_cnpj"],
            "data_emissao": nota["data_emissao"],
            "data_recebimento": nota.get("data_recebimento", ""),
            "valor_total": float(nota["valor_total"]),
            "valor_produtos": float(nota["valor_produtos"]),
            "valor_servicos": float(nota.get("valor_servicos", 0)),
            "valor_desconto": float(nota.get("valor_desconto", 0)),
            "valor_frete": float(nota.get("valor_frete", 0)),
            "icms_total": float(nota.get("icms_total", 0)),
            "ipi_total": float(nota.get("ipi_total", 0)),
            "status": nota.get("status", "recebida"),
            "observacoes": nota.get("observacoes", ""),
            "created_at": nota.get("created_at", "")
        }
        notas_clean.append(nota_clean)

    return {
        "periodo": {
            "data_inicio": data_inicio,
            "data_fim": data_fim
        },
        "totais": {
            "total_notas": total_notas,
            "valor_total_geral": valor_total_geral,
            "valor_produtos_geral": valor_produtos_geral,
            "valor_impostos_geral": valor_impostos_geral
        },
        "fornecedores": fornecedores,
        "notas": notas_clean
    }

@api_router.get("/notas-fiscais/{nota_id}")
async def get_nota_fiscal(nota_id: str, current_user: UserBase = Depends(get_current_user)):
    """Busca uma nota fiscal específica"""
    nota = await db.notas_fiscais.find_one({"id": nota_id, "unidade_id": current_user.unidade_id})
    
    if not nota:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    return {
        "id": nota.get("id", str(nota.get("_id", ""))),
        "numero": nota["numero"],
        "serie": nota["serie"],
        "fornecedor_nome": nota["fornecedor_nome"],
        "fornecedor_cnpj": nota["fornecedor_cnpj"],
        "data_emissao": nota["data_emissao"],
        "data_recebimento": nota.get("data_recebimento", ""),
        "valor_total": float(nota["valor_total"]),
        "valor_produtos": float(nota["valor_produtos"]),
        "valor_servicos": float(nota.get("valor_servicos", 0)),
        "valor_desconto": float(nota.get("valor_desconto", 0)),
        "valor_frete": float(nota.get("valor_frete", 0)),
        "icms_total": float(nota.get("icms_total", 0)),
        "ipi_total": float(nota.get("ipi_total", 0)),
        "status": nota.get("status", "recebida"),
        "produtos": nota.get("produtos", []),
        "observacoes": nota.get("observacoes", ""),
        "created_at": nota.get("created_at", "")
    }

@api_router.delete("/notas-fiscais/{nota_id}")
async def delete_nota_fiscal(nota_id: str, current_user: UserBase = Depends(get_current_user)):
    """Deleta uma nota fiscal"""
    result = await db.notas_fiscais.delete_one({
        "id": nota_id, 
        "unidade_id": current_user.unidade_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nota fiscal não encontrada")
    
    return {"message": "Nota fiscal deletada com sucesso"}

# Unidades routes
@api_router.get("/unidades")
async def get_unidades(current_user: UserBase = Depends(get_current_user)):
    """Lista todas as unidades"""
    unidades = await db.unidades.find().to_list(1000)
    result = []
    for unidade in unidades:
        # Calcular estatísticas da unidade
        total_produtos = await db.produtos.count_documents({"unidade_id": unidade["id"]})
        total_usuarios = await db.users.count_documents({"unidade_id": unidade["id"]})
        
        # Vendas do mês atual
        start_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        vendas_mes = await db.vendas.find({
            "unidade_id": unidade["id"],
            "created_at": {"$gte": start_month}
        }).to_list(1000)
        vendas_mes_valor = sum(venda.get("total", 0) for venda in vendas_mes)
        
        unidade_clean = {
            "id": unidade.get("id", str(unidade.get("_id", ""))),
            "nome": unidade["nome"],
            "endereco": unidade["endereco"],
            "telefone": unidade["telefone"],
            "email": unidade.get("email", ""),
            "cnpj": unidade.get("cnpj", ""),
            "responsavel": unidade.get("responsavel", ""),
            "ativa": unidade.get("ativa", True),
            "total_produtos": total_produtos,
            "total_usuarios": total_usuarios,
            "vendas_mes": vendas_mes_valor,
            "created_at": unidade.get("created_at", "")
        }
        result.append(unidade_clean)
    
    return result

@api_router.post("/unidades", response_model=Unidade)
async def create_unidade(unidade_data: UnidadeCreate, current_user: UserBase = Depends(get_current_user)):
    """Cria uma nova unidade"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar unidades")
    
    unidade_obj = Unidade(**unidade_data.dict())
    await db.unidades.insert_one(unidade_obj.dict())
    
    return unidade_obj

@api_router.get("/dashboard/consolidado")
async def get_dashboard_consolidado(current_user: UserBase = Depends(get_current_user)):
    """Retorna dados consolidados de todas as unidades"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem acessar dados consolidados")
    
    # Totais consolidados
    total_produtos = await db.produtos.count_documents({})
    total_clientes = await db.clientes.count_documents({})
    total_usuarios = await db.users.count_documents({})
    
    # Vendas totais do mês
    start_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    vendas = await db.vendas.find({"created_at": {"$gte": start_month}}).to_list(10000)
    vendas_total = sum(venda.get("total", 0) for venda in vendas)
    
    # Lucro total (simulado - seria necessário ter dados de custo)
    lucro_total = vendas_total * 0.3  # Assumindo 30% de margem média
    
    return {
        "produtos_total": total_produtos,
        "clientes_total": total_clientes,
        "usuarios_total": total_usuarios,
        "vendas_total": vendas_total,
        "lucro_total": lucro_total
    }

# Transferências routes
@api_router.get("/transferencias")
async def get_transferencias(current_user: UserBase = Depends(get_current_user)):
    """Lista transferências relacionadas à unidade do usuário"""
    # Mostrar transferências onde a unidade é origem ou destino
    filtro = {
        "$or": [
            {"unidade_origem_id": current_user.unidade_id},
            {"unidade_destino_id": current_user.unidade_id}
        ]
    }
    transferencias = await db.transferencias.find(filtro).to_list(1000)
    result = []
    
    for transferencia in transferencias:
        # Buscar dados do produto
        produto = await db.produtos.find_one({"id": transferencia["produto_id"]})
        unidade_origem = await db.unidades.find_one({"id": transferencia["unidade_origem_id"]})
        unidade_destino = await db.unidades.find_one({"id": transferencia["unidade_destino_id"]})
        
        transferencia_clean = {
            "id": transferencia.get("id", str(transferencia.get("_id", ""))),
            "produto_id": transferencia["produto_id"],
            "produto_nome": produto["nome"] if produto else "Produto não encontrado",
            "unidade_origem_id": transferencia["unidade_origem_id"],
            "unidade_origem_nome": unidade_origem["nome"] if unidade_origem else "Origem não encontrada",
            "unidade_destino_id": transferencia["unidade_destino_id"],
            "unidade_destino_nome": unidade_destino["nome"] if unidade_destino else "Destino não encontrado",
            "quantidade": transferencia["quantidade"],
            "status": transferencia.get("status", "pendente"),
            "observacoes": transferencia.get("observacoes", ""),
            "created_at": transferencia.get("created_at", "")
        }
        result.append(transferencia_clean)
    
    return result

@api_router.post("/transferencias", response_model=TransferenciaProduto)
async def create_transferencia(transferencia_data: TransferenciaCreate, current_user: UserBase = Depends(get_current_user)):
    """Cria uma nova transferência"""
    # Verificar se o produto existe e tem quantidade suficiente
    produto = await db.produtos.find_one({"id": transferencia_data.produto_id, "unidade_id": current_user.unidade_id})
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    if produto["quantidade"] < transferencia_data.quantidade:
        raise HTTPException(status_code=400, detail="Quantidade insuficiente em estoque")
    
    transferencia_dict = transferencia_data.dict()
    transferencia_dict.update({
        "unidade_origem_id": current_user.unidade_id,
        "usuario_id": current_user.id
    })
    
    transferencia_obj = TransferenciaProduto(**transferencia_dict)
    await db.transferencias.insert_one(transferencia_obj.dict())
    
    return transferencia_obj

@api_router.put("/transferencias/{transferencia_id}/confirmar")
async def confirmar_transferencia(transferencia_id: str, current_user: UserBase = Depends(get_current_user)):
    """Confirma uma transferência (apenas admin)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem confirmar transferências")
    
    transferencia = await db.transferencias.find_one({"id": transferencia_id})
    if not transferencia:
        raise HTTPException(status_code=404, detail="Transferência não encontrada")
    
    if transferencia["status"] != "pendente":
        raise HTTPException(status_code=400, detail="Transferência não está pendente")
    
    # Atualizar status da transferência
    await db.transferencias.update_one(
        {"id": transferencia_id},
        {"$set": {"status": "confirmada"}}
    )
    
    # Reduzir quantidade na unidade origem
    await db.produtos.update_one(
        {"id": transferencia["produto_id"], "unidade_id": transferencia["unidade_origem_id"]},
        {"$inc": {"quantidade": -transferencia["quantidade"]}}
    )
    
    # Verificar se produto existe na unidade destino
    produto_destino = await db.produtos.find_one({
        "codigo_barras": (await db.produtos.find_one({"id": transferencia["produto_id"]}))["codigo_barras"],
        "unidade_id": transferencia["unidade_destino_id"]
    })
    
    if produto_destino:
        # Produto já existe na unidade destino, incrementar quantidade
        await db.produtos.update_one(
            {"id": produto_destino["id"]},
            {"$inc": {"quantidade": transferencia["quantidade"]}}
        )
    else:
        # Produto não existe na unidade destino, criar novo
        produto_origem = await db.produtos.find_one({"id": transferencia["produto_id"]})
        novo_produto = produto_origem.copy()
        novo_produto["id"] = str(uuid.uuid4())
        novo_produto["quantidade"] = transferencia["quantidade"]
        novo_produto["unidade_id"] = transferencia["unidade_destino_id"]
        
        await db.produtos.insert_one(novo_produto)
    
    return {"message": "Transferência confirmada com sucesso"}

@api_router.put("/transferencias/{transferencia_id}/receber")
async def receber_transferencia(transferencia_id: str, current_user: UserBase = Depends(get_current_user)):
    """Confirma o recebimento de uma transferência na unidade destino"""
    transferencia = await db.transferencias.find_one({"id": transferencia_id})
    if not transferencia:
        raise HTTPException(status_code=404, detail="Transferência não encontrada")
    
    # Verificar se o usuário é da unidade destino
    if transferencia["unidade_destino_id"] != current_user.unidade_id:
        raise HTTPException(status_code=403, detail="Você só pode receber transferências destinadas à sua unidade")
    
    if transferencia["status"] != "confirmada":
        raise HTTPException(status_code=400, detail="Transferência não está confirmada para recebimento")
    
    # Atualizar status
    await db.transferencias.update_one(
        {"id": transferencia_id},
        {"$set": {"status": "recebida"}}
    )
    
    # Adicionar produto ao estoque da unidade destino
    produto_origem = await db.produtos.find_one({"id": transferencia["produto_id"]})
    if not produto_origem:
        raise HTTPException(status_code=404, detail="Produto origem não encontrado")
    
    # Verificar se produto já existe na unidade destino
    produto_destino = await db.produtos.find_one({
        "codigo_barras": produto_origem["codigo_barras"],
        "unidade_id": current_user.unidade_id
    })
    
    if produto_destino:
        # Incrementar quantidade existente
        await db.produtos.update_one(
            {"id": produto_destino["id"]},
            {"$inc": {"quantidade": transferencia["quantidade"]}}
        )
    else:
        # Criar novo produto na unidade destino
        novo_produto = produto_origem.copy()
        novo_produto["id"] = str(uuid.uuid4())
        novo_produto["quantidade"] = transferencia["quantidade"]
        novo_produto["unidade_id"] = current_user.unidade_id
        novo_produto["created_at"] = datetime.now(timezone.utc)
        
        await db.produtos.insert_one(novo_produto)
    
    return {"message": "Transferência recebida com sucesso"}

@api_router.get("/dashboard/unidades")
async def get_dashboard_unidades(current_user: UserBase = Depends(get_current_user)):
    """Dashboard com dados por unidade (apenas para admin)"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem acessar estes dados")
    
    unidades = await db.unidades.find().to_list(1000)
    resultado = []
    
    for unidade in unidades:
        # Estatísticas da unidade
        total_produtos = await db.produtos.count_documents({"unidade_id": unidade["id"]})
        total_clientes = await db.clientes.count_documents({"unidade_id": unidade["id"]})
        
        # Vendas do mês atual
        start_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        vendas = await db.vendas.find({
            "unidade_id": unidade["id"],
            "created_at": {"$gte": start_month}
        }).to_list(1000)
        
        vendas_mes = sum(venda.get("total", 0) for venda in vendas)
        total_vendas_mes = len(vendas)
        
        # Produtos em estoque baixo
        produtos_estoque_baixo = await db.produtos.find({
            "unidade_id": unidade["id"],
            "$expr": {"$lte": ["$quantidade", "$estoque_minimo"]}
        }).to_list(1000)
        
        # Transferências pendentes (enviadas e recebidas)
        transferencias_enviadas = await db.transferencias.count_documents({
            "unidade_origem_id": unidade["id"],
            "status": {"$in": ["pendente", "confirmada"]}
        })
        
        transferencias_recebidas = await db.transferencias.count_documents({
            "unidade_destino_id": unidade["id"],
            "status": {"$in": ["confirmada", "recebida"]}
        })
        
        unidade_data = {
            "id": unidade["id"],
            "nome": unidade["nome"],
            "endereco": unidade["endereco"],
            "responsavel": unidade.get("responsavel", ""),
            "telefone": unidade["telefone"],
            "ativa": unidade.get("ativa", True),
            "estatisticas": {
                "total_produtos": total_produtos,
                "total_clientes": total_clientes,
                "vendas_mes": vendas_mes,
                "total_vendas_mes": total_vendas_mes,
                "produtos_estoque_baixo": len(produtos_estoque_baixo),
                "transferencias_enviadas": transferencias_enviadas,
                "transferencias_recebidas": transferencias_recebidas
            }
        }
        resultado.append(unidade_data)
    
    return resultado

@api_router.get("/relatorios/unidade/{unidade_id}")
async def get_relatorio_unidade(
    unidade_id: str,
    data_inicio: str = None,
    data_fim: str = None,
    current_user: UserBase = Depends(get_current_user)
):
    """Relatório detalhado de uma unidade específica"""
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Apenas administradores podem acessar relatórios de unidades")
    
    # Verificar se unidade existe
    unidade = await db.unidades.find_one({"id": unidade_id})
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")
    
    # Filtros de data
    filtro_data = {}
    if data_inicio and data_fim:
        try:
            start_date = datetime.fromisoformat(data_inicio.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(data_fim.replace('Z', '+00:00'))
            filtro_data = {
                "created_at": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }
        except:
            pass
    
    # Dados da unidade
    produtos = await db.produtos.find({"unidade_id": unidade_id}).to_list(1000)
    clientes = await db.clientes.find({"unidade_id": unidade_id}).to_list(1000)
    
    # Vendas do período
    filtro_vendas = {"unidade_id": unidade_id}
    filtro_vendas.update(filtro_data)
    vendas = await db.vendas.find(filtro_vendas).to_list(1000)
    
    # Transferências do período
    filtro_transferencias = {
        "$or": [
            {"unidade_origem_id": unidade_id},
            {"unidade_destino_id": unidade_id}
        ]
    }
    filtro_transferencias.update(filtro_data)
    transferencias = await db.transferencias.find(filtro_transferencias).to_list(1000)
    
    # Calcular métricas
    total_vendas = sum(venda.get("total", 0) for venda in vendas)
    vendas_por_metodo = {}
    for venda in vendas:
        metodo = venda.get("metodo_pagamento", "outros")
        vendas_por_metodo[metodo] = vendas_por_metodo.get(metodo, 0) + venda.get("total", 0)
    
    # Top produtos vendidos
    produtos_vendidos = {}
    for venda in vendas:
        for item in venda.get("items", []):
            produto_id = item.get("produto_id")
            quantidade = item.get("quantidade", 0)
            produtos_vendidos[produto_id] = produtos_vendidos.get(produto_id, 0) + quantidade
    
    top_produtos = []
    for produto_id, quantidade in sorted(produtos_vendidos.items(), key=lambda x: x[1], reverse=True)[:5]:
        produto = await db.produtos.find_one({"id": produto_id})
        if produto:
            top_produtos.append({
                "nome": produto["nome"],
                "quantidade_vendida": quantidade,
                "estoque_atual": produto["quantidade"]
            })
    
    return {
        "unidade": {
            "id": unidade["id"],
            "nome": unidade["nome"],
            "endereco": unidade["endereco"],
            "responsavel": unidade.get("responsavel", "")
        },
        "periodo": {
            "data_inicio": data_inicio,
            "data_fim": data_fim
        },
        "resumo": {
            "total_produtos": len(produtos),
            "total_clientes": len(clientes),
            "total_vendas": len(vendas),
            "valor_vendas": total_vendas,
            "total_transferencias": len(transferencias)
        },
        "vendas_por_metodo": vendas_por_metodo,
        "top_produtos": top_produtos,
        "produtos_estoque_baixo": [
            {
                "nome": p["nome"],
                "quantidade": p["quantidade"],
                "estoque_minimo": p["estoque_minimo"]
            }
            for p in produtos if p["quantidade"] <= p.get("estoque_minimo", 10)
        ],
        "transferencias_resumo": {
            "enviadas": len([t for t in transferencias if t["unidade_origem_id"] == unidade_id]),
            "recebidas": len([t for t in transferencias if t["unidade_destino_id"] == unidade_id])
        }
    }

# Include the router in the main app
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