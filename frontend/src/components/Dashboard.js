import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock
} from "lucide-react";
import { toast } from "sonner";

const Dashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState({
    vendas: [],
    produtosVencendo: [],
    fiadosAtrasados: [],
    stats: {
      total_produtos: 0,
      total_clientes: 0,
      produtos_estoque_baixo: 0,
      produtos_estoque_baixo_detalhes: [],
      fiados_pendentes: 0
    }
  });
  const [showEstoqueBaixo, setShowEstoqueBaixo] = useState(false);
  const [showFiadosPendentes, setShowFiadosPendentes] = useState(false);
  const [dateRange, setDateRange] = useState({
    inicio: new Date().toISOString().split('T')[0],
    fim: new Date().toISOString().split('T')[0]
  });
  const [vendasPeriodo, setVendasPeriodo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch produtos vencendo
      const produtosResponse = await axios.get('/dashboard/produtos-validade');
      
      // Fetch fiados
      const fiadosResponse = await axios.get('/fiados');
      
      // Fetch estatísticas gerais
      const statsResponse = await axios.get('/dashboard/stats');
      
      // Fetch vendas de hoje automaticamente
      const hoje = new Date().toISOString().split('T')[0];
      const vendasResponse = await axios.get('/dashboard/vendas-periodo', {
        params: {
          data_inicio: hoje + 'T00:00:00',
          data_fim: hoje + 'T23:59:59'
        }
      });
      
      setDashboardData({
        produtosVencendo: produtosResponse.data,
        fiadosAtrasados: fiadosResponse.data.filter(f => f.status !== 'pago'),
        stats: statsResponse.data
      });
      
      setVendasPeriodo(vendasResponse.data);
      
    } catch (error) {
      console.error('Erro detalhado:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendasPeriodo = async () => {
    try {
      const response = await axios.get('/dashboard/vendas-periodo', {
        params: {
          data_inicio: dateRange.inicio + 'T00:00:00',
          data_fim: dateRange.fim + 'T23:59:59'
        }
      });
      setVendasPeriodo(response.data);
      toast.success('Relatório de vendas atualizado');
    } catch (error) {
      toast.error('Erro ao buscar vendas do período');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pendente': return 'bg-red-100 text-red-800';
      case 'pago_parcial': return 'bg-yellow-100 text-yellow-800';
      case 'pago': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600">
          Bem-vindo de volta, {user.full_name}! Aqui está um resumo do seu sistema.
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Vendas Hoje</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(vendasPeriodo?.total_vendas || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Transações</p>
                <p className="text-2xl font-bold">
                  {vendasPeriodo?.quantidade_vendas || 0}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowEstoqueBaixo(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Estoque Baixo</p>
                <p className="text-2xl font-bold">
                  {dashboardData.stats.produtos_estoque_baixo}
                </p>
                <p className="text-xs text-amber-200 mt-1">Clique para ver</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowFiadosPendentes(true)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Fiados Pendentes</p>
                <p className="text-2xl font-bold">
                  {dashboardData.stats.fiados_pendentes}
                </p>
                <p className="text-xs text-red-200 mt-1">Clique para ver</p>
              </div>
              <Users className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle className="flex items-center gap-2 text-indigo-800">
            <Clock className="h-5 w-5" />
            Ações Rápidas
          </CardTitle>
          <CardDescription className="text-indigo-700">
            Acesso rápido às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              className="h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white flex flex-col items-center justify-center gap-2"
              onClick={() => window.location.href = '/pdv'}
            >
              <ShoppingCart className="h-6 w-6" />
              <span>Nova Venda</span>
            </Button>
            
            <Button 
              className="h-20 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white flex flex-col items-center justify-center gap-2"
              onClick={() => window.location.href = '/produtos'}
            >
              <Package className="h-6 w-6" />
              <span>Cadastrar Produto</span>
            </Button>
            
            <Button 
              className="h-20 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white flex flex-col items-center justify-center gap-2"
              onClick={() => window.location.href = '/clientes'}
            >
              <Users className="h-6 w-6" />
              <span>Novo Cliente</span>
            </Button>
            
            <Button 
              className="h-20 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex flex-col items-center justify-center gap-2"
              onClick={() => window.location.href = '/relatorios'}
            >
              <TrendingUp className="h-6 w-6" />
              <span>Ver Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vendas por Período */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Relatório de Vendas por Período
          </CardTitle>
          <CardDescription>
            Consulte as vendas realizadas em um período específico
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Data Início
              </label>
              <Input
                type="date"
                value={dateRange.inicio}
                onChange={(e) => setDateRange({...dateRange, inicio: e.target.value})}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Data Fim
              </label>
              <Input
                type="date"
                value={dateRange.fim}
                onChange={(e) => setDateRange({...dateRange, fim: e.target.value})}
                className="w-full"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={fetchVendasPeriodo}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Consultar
              </Button>
            </div>
          </div>
          
          {vendasPeriodo && (
            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 p-6 rounded-lg border border-emerald-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-emerald-800 mb-2">Total de Vendas</h3>
                  <p className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(vendasPeriodo.total_vendas)}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-800 mb-2">Quantidade de Transações</h3>
                  <p className="text-2xl font-bold text-emerald-900">
                    {vendasPeriodo.quantidade_vendas}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos Vencendo */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Produtos com Validade Próxima
            </CardTitle>
            <CardDescription className="text-amber-700">
              Produtos que vencem nos próximos 3 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {dashboardData.produtosVencendo.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum produto vencendo em breve</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.produtosVencendo.slice(0, 5).map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between p-3 border border-amber-200 rounded-lg bg-amber-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{produto.nome}</p>
                      <p className="text-sm text-amber-700">Validade: {produto.validade}</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800">
                      {produto.quantidade} un.
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fiados Atrasados */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Clock className="h-5 w-5" />
              Fiados Pendentes
            </CardTitle>
            <CardDescription className="text-red-700">
              Clientes com valores em aberto
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {dashboardData.fiadosAtrasados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum fiado pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.fiadosAtrasados.slice(0, 5).map((fiado) => (
                  <div key={fiado.id} className="flex items-center justify-between p-3 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{fiado.cliente_nome}</p>
                      <p className="text-sm text-red-700">
                        Valor: {formatCurrency(fiado.valor - fiado.valor_pago)}
                      </p>
                    </div>
                    <Badge className={getStatusColor(fiado.status)}>
                      {fiado.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Estoque Baixo */}
      <Dialog open={showEstoqueBaixo} onOpenChange={setShowEstoqueBaixo}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Produtos com Estoque Baixo
            </DialogTitle>
            <DialogDescription>
              Produtos que estão abaixo do estoque mínimo definido
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            {dashboardData.stats.produtos_estoque_baixo_detalhes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum produto com estoque baixo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.stats.produtos_estoque_baixo_detalhes.map((produto) => (
                  <div key={produto.id} className="p-4 border border-amber-200 rounded-lg bg-amber-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{produto.nome}</h3>
                      <Badge className="bg-amber-100 text-amber-800">
                        {produto.localizacao}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Estoque atual:</span>
                        <span className="font-semibold text-red-600 ml-2">{produto.quantidade}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Estoque mínimo:</span>
                        <span className="font-semibold text-gray-800 ml-2">{produto.estoque_minimo}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => setShowEstoqueBaixo(false)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;