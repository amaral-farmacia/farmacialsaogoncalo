import requests
import sys
from datetime import datetime, timedelta
import json

class FarmaciaAPITester:
    def __init__(self, base_url="https://med-inventory-15.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = {
            'produtos': [],
            'clientes': [],
            'vendas': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, username, password):
        """Test login and get token"""
        print(f"\n🔐 Testing login for user: {username}")
        success, response = self.run_test(
            f"Login - {username}",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            print(f"   User: {self.user_data['full_name']} ({self.user_data['role']})")
            return True
        return False

    def test_get_me(self):
        """Test get current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_get_produtos(self):
        """Test get all products"""
        success, response = self.run_test(
            "Get Products",
            "GET",
            "produtos",
            200
        )
        if success:
            print(f"   Found {len(response)} products")
            for produto in response[:3]:  # Show first 3
                print(f"   - {produto['nome']} (Código: {produto['codigo_barras']}) - R$ {produto['preco']}")
        return success, response if success else []

    def test_buscar_produto_por_codigo(self, codigo):
        """Test search product by barcode"""
        success, response = self.run_test(
            f"Search Product by Code - {codigo}",
            "GET",
            f"produtos/buscar/{codigo}",
            200
        )
        if success:
            print(f"   Found: {response['nome']} - R$ {response['preco']}")
        return success, response if success else {}

    def test_create_produto(self):
        """Test create new product"""
        produto_data = {
            "nome": "Teste Medicamento",
            "codigo_barras": "7896333999999",
            "validade": "2025-12-31",
            "preco": 15.50,
            "quantidade": 20,
            "localizacao": "T1"
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "produtos",
            200,
            data=produto_data
        )
        
        if success:
            self.created_items['produtos'].append(response['id'])
            print(f"   Created product: {response['nome']} (ID: {response['id']})")
        
        return success

    def test_get_clientes(self):
        """Test get all clients"""
        success, response = self.run_test(
            "Get Clients",
            "GET",
            "clientes",
            200
        )
        if success:
            print(f"   Found {len(response)} clients")
            for cliente in response:
                fiado_info = f" (Fiado: R$ {cliente['fiado_total']})" if cliente['fiado_total'] > 0 else ""
                print(f"   - {cliente['nome']}{fiado_info}")
        return success, response if success else []

    def test_create_cliente(self):
        """Test create new client"""
        cliente_data = {
            "nome": "Cliente Teste",
            "cpf": "000.000.000-00",
            "telefone": "(11) 99999-0000"
        }
        
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clientes",
            200,
            data=cliente_data
        )
        
        if success:
            self.created_items['clientes'].append(response['id'])
            print(f"   Created client: {response['nome']} (ID: {response['id']})")
        
        return success, response if success else {}

    def test_create_venda(self, produtos, cliente_id=None):
        """Test create sale"""
        if not produtos:
            print("❌ No products available for sale test")
            return False
        
        # Use first product for sale
        produto = produtos[0]
        
        venda_data = {
            "cliente_id": cliente_id,
            "items": [
                {
                    "produto_id": produto['id'],
                    "quantidade": 2,
                    "preco_unitario": produto['preco']
                }
            ],
            "metodo_pagamento": "dinheiro",
            "valor_pago": produto['preco'] * 2 + 5  # Pay extra for change
        }
        
        success, response = self.run_test(
            "Create Sale - Cash",
            "POST",
            "vendas",
            200,
            data=venda_data
        )
        
        if success:
            self.created_items['vendas'].append(response['id'])
            print(f"   Sale total: R$ {response['total']}")
            print(f"   Change: R$ {response['troco']}")
        
        return success

    def test_create_venda_fiado(self, produtos, cliente_id):
        """Test create sale with fiado (credit)"""
        if not produtos or not cliente_id:
            print("❌ Missing products or client for fiado sale test")
            return False
        
        produto = produtos[0]
        
        venda_data = {
            "cliente_id": cliente_id,
            "items": [
                {
                    "produto_id": produto['id'],
                    "quantidade": 1,
                    "preco_unitario": produto['preco']
                }
            ],
            "metodo_pagamento": "fiado",
            "valor_pago": 0
        }
        
        success, response = self.run_test(
            "Create Sale - Fiado",
            "POST",
            "vendas",
            200,
            data=venda_data
        )
        
        if success:
            print(f"   Fiado sale total: R$ {response['total']}")
        
        return success

    def test_get_vendas(self):
        """Test get all sales"""
        success, response = self.run_test(
            "Get Sales",
            "GET",
            "vendas",
            200
        )
        if success:
            print(f"   Found {len(response)} sales")
        return success

    def test_get_fiados(self):
        """Test get all fiados"""
        success, response = self.run_test(
            "Get Fiados",
            "GET",
            "fiados",
            200
        )
        if success:
            print(f"   Found {len(response)} fiados")
            for fiado in response:
                print(f"   - {fiado.get('cliente_nome', 'Unknown')}: R$ {fiado['valor']} (Pago: R$ {fiado['valor_pago']})")
        return success, response if success else []

    def test_pagar_fiado(self, fiados):
        """Test pay fiado"""
        if not fiados:
            print("❌ No fiados available for payment test")
            return False
        
        fiado = fiados[0]
        valor_restante = fiado['valor'] - fiado['valor_pago']
        pagamento_parcial = min(10.0, valor_restante)
        
        success, response = self.run_test(
            f"Pay Fiado - R$ {pagamento_parcial}",
            "POST",
            f"fiados/{fiado['id']}/pagar",
            200,
            data={"valor": pagamento_parcial}
        )
        
        return success

    def test_dashboard_vendas_periodo(self):
        """Test dashboard sales by period"""
        hoje = datetime.now()
        ontem = hoje - timedelta(days=1)
        
        success, response = self.run_test(
            "Dashboard - Sales by Period",
            "GET",
            f"dashboard/vendas-periodo?data_inicio={ontem.isoformat()}&data_fim={hoje.isoformat()}",
            200
        )
        
        if success:
            print(f"   Total sales: R$ {response.get('total_vendas', 0)}")
            print(f"   Number of sales: {response.get('quantidade_vendas', 0)}")
        
        return success

    def test_dashboard_produtos_validade(self):
        """Test dashboard products expiring soon"""
        success, response = self.run_test(
            "Dashboard - Products Expiring Soon",
            "GET",
            "dashboard/produtos-validade",
            200
        )
        
        if success:
            print(f"   Products expiring in 3 months: {len(response)}")
        
        return success

    def test_get_boletos(self):
        """Test get all boletos with automatic status updates"""
        success, response = self.run_test(
            "Get Boletos",
            "GET",
            "boletos",
            200
        )
        if success:
            print(f"   Found {len(response)} boletos")
            # Check for sample data
            fornecedores = [b['fornecedor'] for b in response]
            expected_fornecedores = ['Cimed', 'Boticário', 'Distribuidora São Paulo']
            
            for fornecedor in expected_fornecedores:
                if fornecedor in fornecedores:
                    print(f"   ✅ Sample data found: {fornecedor}")
                else:
                    print(f"   ❌ Sample data missing: {fornecedor}")
            
            # Show boletos by status
            status_count = {}
            for boleto in response:
                status = boleto['status']
                status_count[status] = status_count.get(status, 0) + 1
                print(f"   - {boleto['fornecedor']}: R$ {boleto['valor']} ({status}) - Venc: {boleto['data_vencimento']}")
            
            print(f"   Status summary: {status_count}")
        
        return success, response if success else []

    def test_create_boleto(self):
        """Test create new boleto"""
        boleto_data = {
            "fornecedor": "Farmácia Teste Ltda",
            "valor": 750.00,
            "data_vencimento": "2025-10-15",
            "descricao": "Compra de medicamentos para teste",
            "categoria": "medicamentos",
            "numero_boleto": "TEST123456"
        }
        
        success, response = self.run_test(
            "Create Boleto",
            "POST",
            "boletos",
            200,
            data=boleto_data
        )
        
        if success:
            self.created_items.setdefault('boletos', []).append(response['id'])
            print(f"   Created boleto: {response['fornecedor']} - R$ {response['valor']} (ID: {response['id']})")
            print(f"   Status: {response['status']}, Vencimento: {response['data_vencimento']}")
        
        return success, response if success else {}

    def test_pagar_boleto(self, boletos):
        """Test mark boleto as paid"""
        if not boletos:
            print("❌ No boletos available for payment test")
            return False
        
        # Find a boleto that's not already paid
        boleto_to_pay = None
        for boleto in boletos:
            if boleto['status'] != 'pago':
                boleto_to_pay = boleto
                break
        
        if not boleto_to_pay:
            print("❌ No unpaid boletos available for payment test")
            return False
        
        pagamento_data = {
            "data_pagamento": datetime.now().strftime("%Y-%m-%d"),
            "valor_pago": boleto_to_pay['valor']
        }
        
        success, response = self.run_test(
            f"Pay Boleto - {boleto_to_pay['fornecedor']}",
            "PUT",
            f"boletos/{boleto_to_pay['id']}/pagar",
            200,
            data=pagamento_data
        )
        
        if success:
            print(f"   Marked boleto as paid: R$ {boleto_to_pay['valor']}")
        
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats including boletos data"""
        success, response = self.run_test(
            "Dashboard - Stats with Boletos",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            print(f"   Total produtos: {response.get('total_produtos', 0)}")
            print(f"   Total clientes: {response.get('total_clientes', 0)}")
            print(f"   Produtos estoque baixo: {response.get('produtos_estoque_baixo', 0)}")
            print(f"   Fiados pendentes: {response.get('fiados_pendentes', 0)}")
            
            # Check boletos data specifically
            boletos_vencidos = response.get('boletos_vencidos', 0)
            boletos_a_pagar = response.get('boletos_a_pagar', 0)
            boletos_a_pagar_valor = response.get('boletos_a_pagar_valor', 0)
            
            print(f"   🧾 Boletos vencidos: {boletos_vencidos}")
            print(f"   🧾 Boletos a pagar: {boletos_a_pagar}")
            print(f"   🧾 Valor a pagar: R$ {boletos_a_pagar_valor}")
            
            # Check if boletos details are included
            if 'boletos_vencidos_detalhes' in response:
                print(f"   ✅ Boletos vencidos detalhes included ({len(response['boletos_vencidos_detalhes'])} items)")
            else:
                print(f"   ❌ Boletos vencidos detalhes missing")
        
        return success

def main():
    print("🏥 SISTEMA DE FARMÁCIA - TESTE DE APIs")
    print("=" * 50)
    
    tester = FarmaciaAPITester()
    
    # Test 1: Login as admin
    print("\n📋 FASE 1: AUTENTICAÇÃO")
    if not tester.test_login("admin", "admin123"):
        print("❌ Admin login failed, stopping tests")
        return 1
    
    # Test current user info
    tester.test_get_me()
    
    # Test 2: Products
    print("\n📋 FASE 2: GESTÃO DE PRODUTOS")
    produtos_success, produtos = tester.test_get_produtos()
    
    # Test search by barcode
    test_codes = ["7896333123456", "7896333123457", "7896333123458"]
    for code in test_codes:
        tester.test_buscar_produto_por_codigo(code)
    
    # Test create product
    tester.test_create_produto()
    
    # Test 3: Clients
    print("\n📋 FASE 3: GESTÃO DE CLIENTES")
    clientes_success, clientes = tester.test_get_clientes()
    
    # Test create client
    cliente_success, novo_cliente = tester.test_create_cliente()
    
    # Test 4: Sales
    print("\n📋 FASE 4: VENDAS (PDV)")
    if produtos_success and produtos:
        # Test cash sale
        tester.test_create_venda(produtos)
        
        # Test fiado sale
        if clientes:
            cliente_id = clientes[0]['id']  # Use first existing client
            tester.test_create_venda_fiado(produtos, cliente_id)
    
    # Get all sales
    tester.test_get_vendas()
    
    # Test 5: Fiados
    print("\n📋 FASE 5: SISTEMA DE FIADOS")
    fiados_success, fiados = tester.test_get_fiados()
    
    if fiados_success and fiados:
        tester.test_pagar_fiado(fiados)
    
    # Test 6: Boletos System
    print("\n📋 FASE 6: SISTEMA DE BOLETOS")
    boletos_success, boletos = tester.test_get_boletos()
    
    # Test create boleto
    boleto_success, novo_boleto = tester.test_create_boleto()
    
    # Test pay boleto
    if boletos_success and boletos:
        tester.test_pagar_boleto(boletos)
    
    # Test 7: Dashboard with Boletos
    print("\n📋 FASE 7: DASHBOARD COM BOLETOS")
    tester.test_dashboard_vendas_periodo()
    tester.test_dashboard_produtos_validade()
    tester.test_dashboard_stats()  # New test for boletos integration
    
    # Test 8: Login as colaborador
    print("\n📋 FASE 8: TESTE COLABORADOR")
    if tester.test_login("colab1", "123456"):
        tester.test_get_me()
        tester.test_get_produtos()
        tester.test_get_clientes()
        # Test boletos access for colaborador
        tester.test_get_boletos()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 RESULTADOS FINAIS")
    print(f"✅ Testes aprovados: {tester.tests_passed}/{tester.tests_run}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Taxa de sucesso: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Backend APIs funcionando corretamente!")
        return 0
    else:
        print("⚠️  Alguns problemas encontrados no backend")
        return 1

if __name__ == "__main__":
    sys.exit(main())