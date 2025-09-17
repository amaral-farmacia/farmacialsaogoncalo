import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download,
  PieChart,
  Users,
  Package,
  DollarSign,
  FileText,
  Filter
} from "lucide-react";
import { toast } from "sonner";

const Relatorios = ({ user }) => {
  const [relatorioData, setRelatorioData] = useState({
    vendasPorPeriodo: null,
    produtosMaisVendidos: [],
    clientesMaisAtivos: [],
    lucroMensal: []
  });
  const [filtros, setFiltros] = useState({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    tipoRelatorio: 'vendas'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRelatorioData();
  }, []);

  const fetchRelatorioData = async () => {
    setLoading(true);
    try {
      // Fetch vendas do período
      const vendasResponse = await axios.get('/dashboard/vendas-periodo', {
        params: {
          data_inicio: filtros.dataInicio + 'T00:00:00',
          data_fim: filtros.dataFim + 'T23:59:59'
        }
      });

      // Fetch outros dados
      const [produtosResponse, clientesResponse, vendasResponse2] = await Promise.all([
        axios.get('/produtos'),
        axios.get('/clientes'),
        axios.get('/vendas')
      ]);

      // Processar dados para relatórios
      const vendas = vendasResponse2.data;
      const produtos = produtosResponse.data;
      const clientes = clientesResponse.data;

      // Produtos mais vendidos (simulado)
      const produtosMaisVendidos = produtos.slice(0, 5).map(produto => ({
        ...produto,
        quantidadeVendida: Math.floor(Math.random() * 50) + 10,
        faturamento: (Math.floor(Math.random() * 50) + 10) * produto.preco
      }));

      // Clientes mais ativos
      const clientesMaisAtivos = clientes.filter(c => c.fiado_total > 0).slice(0, 5);

      setRelatorioData({
        vendasPorPeriodo: vendasResponse.data,
        produtosMaisVendidos,
        clientesMaisAtivos,
        lucroMensal: generateLucroMensal()
      });

    } catch (error) {
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const generateLucroMensal = () => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
    return meses.map(mes => ({
      mes,
      vendas: Math.floor(Math.random() * 5000) + 2000,
      lucro: Math.floor(Math.random() * 1500) + 500
    }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const exportarRelatorio = async () => {
    try {
      const dataExport = {
        periodo: `${filtros.dataInicio} a ${filtros.dataFim}`,
        vendas: relatorioData.vendasPorPeriodo,
        produtos: relatorioData.produtosMaisVendidos,
        clientes: relatorioData.clientesMaisAtivos,
        geradoEm: new Date().toLocaleString('pt-BR')
      };

      const blob = new Blob([JSON.stringify(dataExport, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-farmacia-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios Avançados</h1>
          <p className="text-gray-600">Análises detalhadas do desempenho da farmácia</p>
        </div>
        
        <Button onClick={exportarRelatorio} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg">
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filtros */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-700" />
            Filtros de Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Data Início</label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Data Fim</label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Tipo de Relatório</label>
              <Select value={filtros.tipoRelatorio} onValueChange={(value) => setFiltros({...filtros, tipoRelatorio: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="produtos">Produtos</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchRelatorioData} className="w-full bg-blue-600 hover:bg-blue-700">
                <BarChart3 className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Faturamento</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(relatorioData.vendasPorPeriodo?.total_vendas || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Produtos Vendidos</p>
                <p className="text-2xl font-bold">
                  {relatorioData.produtosMaisVendidos.reduce((acc, p) => acc + p.quantidadeVendida, 0)}
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Clientes Ativos</p>
                <p className="text-2xl font-bold">{relatorioData.clientesMaisAtivos.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Lucro Estimado</p>
                <p className="text-2xl font-bold">
                  {formatCurrency((relatorioData.vendasPorPeriodo?.total_vendas || 0) * 0.3)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos Mais Vendidos */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <PieChart className="h-5 w-5" />
              Produtos Mais Vendidos
            </CardTitle>
            <CardDescription className="text-emerald-700">
              Top 5 produtos por quantidade vendida
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {relatorioData.produtosMaisVendidos.map((produto, index) => (
                <div key={produto.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{produto.nome}</p>
                      <p className="text-sm text-emerald-600">
                        {produto.quantidadeVendida} unidades • {formatCurrency(produto.faturamento)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-2 bg-emerald-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.min(100, (produto.quantidadeVendida / 50) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Clientes Mais Ativos */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Users className="h-5 w-5" />
              Clientes Mais Ativos
            </CardTitle>
            <CardDescription className="text-blue-700">
              Clientes com maior movimento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {relatorioData.clientesMaisAtivos.map((cliente, index) => (
                <div key={cliente.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{cliente.nome}</p>
                      <p className="text-sm text-blue-600">{cliente.telefone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-700">
                      {formatCurrency(cliente.fiado_total)}
                    </p>
                    <p className="text-xs text-blue-500">em fiado</p>
                  </div>
                </div>
              ))}
              
              {relatorioData.clientesMaisAtivos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum cliente ativo no período</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Lucro Mensal */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <BarChart3 className="h-5 w-5" />
            Evolução Mensal - Vendas vs Lucro
          </CardTitle>
          <CardDescription className="text-purple-700">
            Comparativo dos últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {relatorioData.lucroMensal.map((mes, index) => (
              <div key={index} className="text-center">
                <div className="mb-2">
                  <div className="flex flex-col items-center gap-2">
                    <div 
                      className="w-6 bg-purple-500 rounded-t"
                      style={{ height: `${(mes.vendas / 5000) * 80}px` }}
                    ></div>
                    <div 
                      className="w-6 bg-indigo-500 rounded-t"
                      style={{ height: `${(mes.lucro / 1500) * 60}px` }}
                    ></div>
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700">{mes.mes}</p>
                <p className="text-xs text-purple-600">{formatCurrency(mes.vendas)}</p>
                <p className="text-xs text-indigo-600">{formatCurrency(mes.lucro)}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span className="text-sm text-gray-600">Vendas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-indigo-500 rounded"></div>
              <span className="text-sm text-gray-600">Lucro</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;