import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Building2,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowRightLeft,
  ShoppingCart,
  Calendar,
  BarChart3,
  MapPin,
  Phone,
  Eye
} from "lucide-react";
import { toast } from "sonner";

const DashboardUnidades = ({ user }) => {
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnidade, setSelectedUnidade] = useState(null);
  const [relatorioUnidade, setRelatorioUnidade] = useState(null);
  const [loadingRelatorio, setLoadingRelatorio] = useState(false);

  useEffect(() => {
    fetchUnidades();
  }, []);

  const fetchUnidades = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/dashboard/unidades');
      setUnidades(response.data);
    } catch (error) {
      toast.error('Erro ao carregar dados das unidades');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatorioUnidade = async (unidadeId) => {
    try {
      setLoadingRelatorio(true);
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      const response = await axios.get(`/relatorios/unidade/${unidadeId}`, {
        params: {
          data_inicio: inicioMes.toISOString(),
          data_fim: hoje.toISOString()
        }
      });
      
      setRelatorioUnidade(response.data);
      setSelectedUnidade(unidadeId);
    } catch (error) {
      toast.error('Erro ao carregar relatório da unidade');
    } finally {
      setLoadingRelatorio(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusColor = (ativa) => {
    return ativa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard por Unidades</h1>
          <p className="text-gray-600">Visão detalhada de cada farmácia da rede</p>
        </div>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório Detalhado</TabsTrigger>
        </TabsList>
        
        <TabsContent value="visao-geral" className="space-y-6">
          {/* Cards das Unidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {unidades.map((unidade) => (
              <Card key={unidade.id} className="shadow-lg border-0 hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl text-gray-900">{unidade.nome}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-2">
                        <MapPin className="h-4 w-4" />
                        {unidade.endereco}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(unidade.ativa)}>
                      {unidade.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  
                  {unidade.responsavel && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                      <Users className="h-4 w-4" />
                      <span>{unidade.responsavel}</span>
                    </div>
                  )}
                  
                  {unidade.telefone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{unidade.telefone}</span>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Estatísticas Principais */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <Package className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                      <p className="text-xl font-bold text-blue-900">{unidade.estatisticas.total_produtos}</p>
                      <p className="text-xs text-blue-700">Produtos</p>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <Users className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="text-xl font-bold text-green-900">{unidade.estatisticas.total_clientes}</p>
                      <p className="text-xs text-green-700">Clientes</p>
                    </div>
                  </div>
                  
                  {/* Vendas do Mês */}
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-emerald-800">Vendas Este Mês</span>
                      <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-900">{formatCurrency(unidade.estatisticas.vendas_mes)}</p>
                    <p className="text-sm text-emerald-700">{unidade.estatisticas.total_vendas_mes} vendas realizadas</p>
                  </div>
                  
                  {/* Alertas */}
                  <div className="space-y-2">
                    {unidade.estatisticas.produtos_estoque_baixo > 0 && (
                      <div className="flex items-center justify-between bg-amber-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <span className="text-sm text-amber-800">Estoque Baixo</span>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800">
                          {unidade.estatisticas.produtos_estoque_baixo}
                        </Badge>
                      </div>
                    )}
                    
                    {unidade.estatisticas.transferencias_recebidas > 0 && (
                      <div className="flex items-center justify-between bg-blue-50 p-2 rounded">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-800">Transferências Pendentes</span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {unidade.estatisticas.transferencias_recebidas}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Ações */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => fetchRelatorioUnidade(unidade.id)}
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Ver Relatório
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="comparativo" className="space-y-6">
          {/* Comparativo entre Unidades */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Comparativo de Performance
              </CardTitle>
              <CardDescription>
                Comparação de métricas entre as unidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Vendas */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Vendas do Mês
                  </h4>
                  <div className="space-y-3">
                    {unidades.map((unidade) => (
                      <div key={unidade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{unidade.nome}</p>
                          <p className="text-sm text-gray-600">{unidade.estatisticas.total_vendas_mes} vendas</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(unidade.estatisticas.vendas_mes)}</p>
                          <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (unidade.estatisticas.vendas_mes / Math.max(...unidades.map(u => u.estatisticas.vendas_mes))) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Produtos */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Estoque de Produtos
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {unidades.map((unidade) => (
                      <div key={unidade.id} className="bg-blue-50 p-4 rounded-lg">
                        <p className="font-medium text-blue-900">{unidade.nome}</p>
                        <p className="text-2xl font-bold text-blue-900">{unidade.estatisticas.total_produtos}</p>
                        <p className="text-sm text-blue-700">produtos cadastrados</p>
                        {unidade.estatisticas.produtos_estoque_baixo > 0 && (
                          <p className="text-xs text-amber-700 mt-1">
                            {unidade.estatisticas.produtos_estoque_baixo} em estoque baixo
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="relatorio" className="space-y-6">
          {/* Seletor de Unidade para Relatório */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Relatório Detalhado por Unidade</CardTitle>
              <CardDescription>
                Selecione uma unidade para ver o relatório completo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {unidades.map((unidade) => (
                  <Button
                    key={unidade.id}
                    onClick={() => fetchRelatorioUnidade(unidade.id)}
                    variant={selectedUnidade === unidade.id ? "default" : "outline"}
                    className={selectedUnidade === unidade.id ? "bg-blue-600 hover:bg-blue-700" : ""}
                    disabled={loadingRelatorio}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    {unidade.nome.replace("Farmácia ", "")}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Relatório da Unidade Selecionada */}
          {loadingRelatorio && (
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {relatorioUnidade && !loadingRelatorio && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Resumo Geral */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">{relatorioUnidade.unidade.nome}</CardTitle>
                  <CardDescription>{relatorioUnidade.unidade.endereco}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded text-center">
                      <p className="text-xl font-bold text-blue-900">{relatorioUnidade.resumo.total_produtos}</p>
                      <p className="text-xs text-blue-700">Produtos</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded text-center">
                      <p className="text-xl font-bold text-green-900">{relatorioUnidade.resumo.total_clientes}</p>
                      <p className="text-xs text-green-700">Clientes</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded text-center">
                      <p className="text-xl font-bold text-purple-900">{relatorioUnidade.resumo.total_vendas}</p>
                      <p className="text-xs text-purple-700">Vendas</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded text-center">
                      <p className="text-lg font-bold text-emerald-900">{formatCurrency(relatorioUnidade.resumo.valor_vendas)}</p>
                      <p className="text-xs text-emerald-700">Faturamento</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2">Transferências:</p>
                    <div className="flex justify-between text-sm">
                      <span>Enviadas: <strong>{relatorioUnidade.transferencias_resumo.enviadas}</strong></span>
                      <span>Recebidas: <strong>{relatorioUnidade.transferencias_resumo.recebidas}</strong></span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Produtos */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Top Produtos Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relatorioUnidade.top_produtos.map((produto, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium text-sm">{produto.nome}</p>
                          <p className="text-xs text-gray-600">Estoque: {produto.estoque_atual}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {produto.quantidade_vendida}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Vendas por Método */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Vendas por Método</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(relatorioUnidade.vendas_por_metodo).map(([metodo, valor]) => (
                      <div key={metodo} className="flex justify-between items-center">
                        <span className="capitalize text-sm">{metodo}</span>
                        <span className="font-bold">{formatCurrency(valor)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Produtos Estoque Baixo */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-800">Produtos em Estoque Baixo</CardTitle>
                </CardHeader>
                <CardContent>
                  {relatorioUnidade.produtos_estoque_baixo.length === 0 ? (
                    <p className="text-sm text-gray-600">Nenhum produto em estoque baixo</p>
                  ) : (
                    <div className="space-y-2">
                      {relatorioUnidade.produtos_estoque_baixo.map((produto, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-amber-50 rounded">
                          <span className="text-sm">{produto.nome}</span>
                          <div className="text-right">
                            <p className="text-sm font-bold text-amber-800">{produto.quantidade}</p>
                            <p className="text-xs text-amber-600">Mín: {produto.estoque_minimo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardUnidades;