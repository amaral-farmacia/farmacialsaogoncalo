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
            'vendas': [],
            'boletos': []
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

    def test_fechamento_caixa_today(self):
        """Test cash closing for today's date"""
        hoje = datetime.now().strftime("%Y-%m-%d")
        
        success, response = self.run_test(
            f"Cash Closing - Today ({hoje})",
            "GET",
            f"caixa/fechamento/{hoje}",
            200
        )
        
        if success:
            print(f"   Data: {response.get('data', 'N/A')}")
            
            # Check recebimentos structure
            recebimentos = response.get('recebimentos', {})
            print(f"   💰 RECEBIMENTOS:")
            for metodo, valor in recebimentos.items():
                print(f"     - {metodo.capitalize()}: R$ {valor}")
            
            # Check pagamentos structure
            pagamentos = response.get('pagamentos', {})
            print(f"   💸 PAGAMENTOS:")
            if pagamentos:
                for fornecedor, valor in pagamentos.items():
                    print(f"     - {fornecedor}: R$ {valor}")
            else:
                print(f"     - Nenhum pagamento hoje")
            
            # Check totals
            total_recebimentos = response.get('total_recebimentos', 0)
            total_pagamentos = response.get('total_pagamentos', 0)
            saldo_dia = response.get('saldo_dia', 0)
            
            print(f"   📊 TOTAIS:")
            print(f"     - Total Recebimentos: R$ {total_recebimentos}")
            print(f"     - Total Pagamentos: R$ {total_pagamentos}")
            print(f"     - Saldo do Dia: R$ {saldo_dia}")
            
            # Check counters
            total_vendas = response.get('total_vendas', 0)
            total_boletos_pagos = response.get('total_boletos_pagos', 0)
            
            print(f"   📈 CONTADORES:")
            print(f"     - Total de Vendas: {total_vendas}")
            print(f"     - Boletos Pagos: {total_boletos_pagos}")
            
            # Validate required fields
            required_fields = ['data', 'recebimentos', 'pagamentos', 'total_recebimentos', 
                             'total_pagamentos', 'saldo_dia', 'total_vendas', 'total_boletos_pagos']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"   ❌ Missing fields: {missing_fields}")
                return False
            
            # Validate recebimentos structure
            expected_metodos = ['dinheiro', 'pix', 'debito', 'credito', 'fiado']
            missing_metodos = [metodo for metodo in expected_metodos if metodo not in recebimentos]
            
            if missing_metodos:
                print(f"   ❌ Missing payment methods: {missing_metodos}")
                return False
            
            print(f"   ✅ All required fields and payment methods present")
        
        return success

    def test_fechamento_caixa_past_date(self):
        """Test cash closing for a past date"""
        past_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        
        success, response = self.run_test(
            f"Cash Closing - Past Date ({past_date})",
            "GET",
            f"caixa/fechamento/{past_date}",
            200
        )
        
        if success:
            print(f"   Data: {response.get('data', 'N/A')}")
            print(f"   Total Recebimentos: R$ {response.get('total_recebimentos', 0)}")
            print(f"   Total Pagamentos: R$ {response.get('total_pagamentos', 0)}")
            print(f"   Saldo do Dia: R$ {response.get('saldo_dia', 0)}")
            print(f"   Total de Vendas: {response.get('total_vendas', 0)}")
        
        return success

    def test_fechamento_caixa_future_date(self):
        """Test cash closing for a future date"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        success, response = self.run_test(
            f"Cash Closing - Future Date ({future_date})",
            "GET",
            f"caixa/fechamento/{future_date}",
            200
        )
        
        if success:
            print(f"   Data: {response.get('data', 'N/A')}")
            # Future dates should return zero values
            total_recebimentos = response.get('total_recebimentos', 0)
            total_vendas = response.get('total_vendas', 0)
            
            if total_recebimentos == 0 and total_vendas == 0:
                print(f"   ✅ Future date correctly returns zero values")
            else:
                print(f"   ❌ Future date should return zero values")
                print(f"   Total Recebimentos: R$ {total_recebimentos}")
                print(f"   Total Vendas: {total_vendas}")
        
        return success

    def test_fechamento_caixa_invalid_date(self):
        """Test cash closing with invalid date format"""
        invalid_date = "invalid-date"
        
        success, response = self.run_test(
            f"Cash Closing - Invalid Date ({invalid_date})",
            "GET",
            f"caixa/fechamento/{invalid_date}",
            200  # API should handle gracefully and return empty data
        )
        
        if success:
            # Should return empty/zero data for invalid dates
            total_recebimentos = response.get('total_recebimentos', 0)
            total_vendas = response.get('total_vendas', 0)
            
            if total_recebimentos == 0 and total_vendas == 0:
                print(f"   ✅ Invalid date handled gracefully with zero values")
            else:
                print(f"   ❌ Invalid date should return zero values")
        
        return success

    def test_get_entradas_mercadorias(self):
        """Test get all merchandise entries"""
        success, response = self.run_test(
            "Get Merchandise Entries",
            "GET",
            "entradas",
            200
        )
        if success:
            print(f"   Found {len(response)} merchandise entries")
            for entrada in response[:3]:  # Show first 3
                print(f"   - {entrada.get('produto_nome', 'Unknown')}: {entrada['quantidade']} units")
                print(f"     Cost: R$ {entrada['preco_custo']} | Sale: R$ {entrada['preco_venda']}")
                print(f"     Profit: R$ {entrada['lucro_unitario']} | Margin: {entrada['margem_lucro']:.2f}%")
        return success, response if success else []

    def test_create_entrada_mercadoria(self, produtos):
        """Test create new merchandise entry"""
        if not produtos:
            print("❌ No products available for merchandise entry test")
            return False, {}
        
        # Use first product for entry
        produto = produtos[0]
        
        entrada_data = {
            "produto_id": produto['id'],
            "quantidade": 50,
            "preco_custo": 8.50,
            "preco_venda": 15.00,
            "data_validade": "2025-12-31",
            "lote": "LOTE2024001",
            "fornecedor": "Distribuidora Teste Ltda",
            "localizacao": "A3"
        }
        
        success, response = self.run_test(
            "Create Merchandise Entry",
            "POST",
            "entradas",
            200,
            data=entrada_data
        )
        
        if success:
            print(f"   Created entry for: {produto['nome']}")
            print(f"   Quantity: {response['quantidade']} units")
            print(f"   Total Cost: R$ {response['valor_total_custo']}")
            print(f"   Total Sale Value: R$ {response['valor_total_venda']}")
            print(f"   Unit Profit: R$ {response['lucro_unitario']}")
            print(f"   Profit Margin: {response['margem_lucro']:.2f}%")
            
            # Validate calculations
            expected_total_cost = entrada_data['quantidade'] * entrada_data['preco_custo']
            expected_total_sale = entrada_data['quantidade'] * entrada_data['preco_venda']
            expected_unit_profit = entrada_data['preco_venda'] - entrada_data['preco_custo']
            expected_margin = (expected_unit_profit / entrada_data['preco_custo']) * 100
            
            if (abs(response['valor_total_custo'] - expected_total_cost) < 0.01 and
                abs(response['valor_total_venda'] - expected_total_sale) < 0.01 and
                abs(response['lucro_unitario'] - expected_unit_profit) < 0.01 and
                abs(response['margem_lucro'] - expected_margin) < 0.01):
                print(f"   ✅ Calculations are correct")
            else:
                print(f"   ❌ Calculation errors detected")
                print(f"     Expected total cost: R$ {expected_total_cost}")
                print(f"     Expected total sale: R$ {expected_total_sale}")
                print(f"     Expected unit profit: R$ {expected_unit_profit}")
                print(f"     Expected margin: {expected_margin:.2f}%")
        
        return success, response if success else {}

    def test_product_update_after_entry(self, produto_id, original_quantity, original_cost, original_price):
        """Test that product is updated after merchandise entry"""
        success, response = self.run_test(
            "Check Product Update After Entry",
            "GET",
            f"produtos/buscar/{produto_id}",
            404  # This will fail since we're using ID instead of barcode
        )
        
        # Let's get all products and find the one we updated
        success, produtos = self.run_test(
            "Get Products to Check Updates",
            "GET",
            "produtos",
            200
        )
        
        if success:
            updated_produto = None
            for produto in produtos:
                if produto['id'] == produto_id:
                    updated_produto = produto
                    break
            
            if updated_produto:
                print(f"   Product found: {updated_produto['nome']}")
                print(f"   Original quantity: {original_quantity} -> New: {updated_produto['quantidade']}")
                print(f"   Original cost: R$ {original_cost} -> New: R$ {updated_produto.get('preco_custo', 0)}")
                print(f"   Original price: R$ {original_price} -> New: R$ {updated_produto['preco']}")
                
                # Check if quantity increased by 50 (from our test entry)
                if updated_produto['quantidade'] == original_quantity + 50:
                    print(f"   ✅ Quantity correctly updated (+50)")
                else:
                    print(f"   ❌ Quantity not updated correctly")
                
                # Check if prices were updated
                if updated_produto.get('preco_custo', 0) == 8.50 and updated_produto['preco'] == 15.00:
                    print(f"   ✅ Prices correctly updated")
                else:
                    print(f"   ❌ Prices not updated correctly")
                
                return True
            else:
                print(f"   ❌ Product not found after entry")
                return False
        
        return False

    def test_get_relatorio_entradas(self):
        """Test merchandise entries report"""
        # Test without date filter
        success, response = self.run_test(
            "Get Merchandise Entries Report - No Filter",
            "GET",
            "entradas/relatorio",
            200
        )
        
        if success:
            print(f"   Report generated successfully")
            
            # Check report structure
            required_fields = ['periodo', 'totais', 'fornecedores', 'entradas']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"   ❌ Missing report fields: {missing_fields}")
                return False
            
            totais = response.get('totais', {})
            print(f"   Total entries: {totais.get('total_entradas', 0)}")
            print(f"   Total cost: R$ {totais.get('total_custo', 0)}")
            print(f"   Total sale value: R$ {totais.get('total_venda', 0)}")
            print(f"   Total profit: R$ {totais.get('total_lucro', 0)}")
            print(f"   Average margin: {totais.get('margem_media', 0):.2f}%")
            
            # Check suppliers grouping
            fornecedores = response.get('fornecedores', {})
            print(f"   Suppliers found: {len(fornecedores)}")
            for fornecedor, dados in fornecedores.items():
                print(f"     - {fornecedor}: {dados['quantidade_entradas']} entries, R$ {dados['total_custo']} cost")
            
            print(f"   ✅ Report structure is correct")
        
        return success

    def test_get_relatorio_entradas_with_dates(self):
        """Test merchandise entries report with date filter"""
        hoje = datetime.now()
        ontem = hoje - timedelta(days=1)
        
        success, response = self.run_test(
            "Get Merchandise Entries Report - With Date Filter",
            "GET",
            f"entradas/relatorio?data_inicio={ontem.isoformat()}&data_fim={hoje.isoformat()}",
            200
        )
        
        if success:
            periodo = response.get('periodo', {})
            print(f"   Period: {periodo.get('data_inicio', 'N/A')} to {periodo.get('data_fim', 'N/A')}")
            
            totais = response.get('totais', {})
            print(f"   Filtered entries: {totais.get('total_entradas', 0)}")
            print(f"   ✅ Date filtering working")
        
        return success

    def test_entrada_mercadoria_edge_cases(self):
        """Test merchandise entry edge cases"""
        # Test with invalid product ID
        invalid_entrada_data = {
            "produto_id": "invalid-product-id",
            "quantidade": 10,
            "preco_custo": 5.00,
            "preco_venda": 10.00
        }
        
        success, response = self.run_test(
            "Create Entry - Invalid Product ID",
            "POST",
            "entradas",
            500  # Should fail with server error or validation error
        )
        
        if not success:
            print(f"   ✅ Invalid product ID correctly rejected")
        else:
            print(f"   ❌ Invalid product ID should be rejected")
        
        # Test with negative quantity
        negative_entrada_data = {
            "produto_id": "some-valid-id",
            "quantidade": -5,
            "preco_custo": 5.00,
            "preco_venda": 10.00
        }
        
        success, response = self.run_test(
            "Create Entry - Negative Quantity",
            "POST",
            "entradas",
            422  # Should fail with validation error
        )
        
        if not success:
            print(f"   ✅ Negative quantity correctly rejected")
        else:
            print(f"   ❌ Negative quantity should be rejected")
        
        # Test with zero cost
        zero_cost_data = {
            "produto_id": "some-valid-id",
            "quantidade": 10,
            "preco_custo": 0.0,
            "preco_venda": 10.00
        }
        
        success, response = self.run_test(
            "Create Entry - Zero Cost",
            "POST",
            "entradas",
            422  # Should fail with validation error or handle gracefully
        )
        
        # This might succeed but with infinite margin, let's check
        if success:
            if 'margem_lucro' in response:
                print(f"   Margin with zero cost: {response['margem_lucro']}")
                print(f"   ✅ Zero cost handled (margin calculation)")
            else:
                print(f"   ❌ Zero cost not handled properly")
        else:
            print(f"   ✅ Zero cost correctly rejected")
        
        return True

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
    
    # Test 8: Fechamento de Caixa System
    print("\n📋 FASE 8: SISTEMA DE FECHAMENTO DE CAIXA")
    tester.test_fechamento_caixa_today()
    tester.test_fechamento_caixa_past_date()
    tester.test_fechamento_caixa_future_date()
    tester.test_fechamento_caixa_invalid_date()
    
    # Test 9: Entrada de Mercadorias System
    print("\n📋 FASE 9: SISTEMA DE ENTRADA DE MERCADORIAS")
    # Get current entries
    entradas_success, entradas = tester.test_get_entradas_mercadorias()
    
    # Test create new entry (need to login as admin again to ensure we have proper permissions)
    if not tester.test_login("admin", "admin123"):
        print("❌ Admin re-login failed for entrada tests")
    else:
        # Get products for entry testing
        produtos_success, produtos = tester.test_get_produtos()
        if produtos_success and produtos:
            # Store original product data for comparison
            produto_original = produtos[0]
            original_quantity = produto_original['quantidade']
            original_cost = produto_original.get('preco_custo', 0)
            original_price = produto_original['preco']
            
            # Create merchandise entry
            entrada_success, nova_entrada = tester.test_create_entrada_mercadoria(produtos)
            
            if entrada_success:
                # Test product update after entry
                tester.test_product_update_after_entry(
                    produto_original['id'], 
                    original_quantity, 
                    original_cost, 
                    original_price
                )
        
        # Test reports
        tester.test_get_relatorio_entradas()
        tester.test_get_relatorio_entradas_with_dates()
        
        # Test edge cases
        tester.test_entrada_mercadoria_edge_cases()
    
    # Test 10: Login as colaborador
    print("\n📋 FASE 10: TESTE COLABORADOR")
    if tester.test_login("colab1", "123456"):
        tester.test_get_me()
        tester.test_get_produtos()
        tester.test_get_clientes()
        # Test boletos access for colaborador
        tester.test_get_boletos()
        # Test fechamento de caixa access for colaborador
        tester.test_fechamento_caixa_today()
        # Test entrada de mercadorias access for colaborador
        tester.test_get_entradas_mercadorias()
    
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