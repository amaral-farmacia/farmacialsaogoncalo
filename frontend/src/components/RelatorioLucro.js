import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  BarChart3,
  Calculator,
  Target,
  Award,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const RelatorioLucro = ({ user }) => {
  const [relatorioLucro, setRelatorioLucro] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatorioLucro();
  }, []);

  const fetchRelatorioLucro = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/produtos/relatorio-lucro');
      setRelatorioLucro(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório de lucro');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getMargemColor = (margem) => {
    if (margem >= 50) return 'text-green-600 bg-green-50';
    if (margem >= 30) return 'text-blue-600 bg-blue-50';
    if (margem >= 15) return 'text-yellow-600 bg-yellow-50';
    if (margem >= 5) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!relatorioLucro) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Erro ao carregar relatório de lucro</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatório de Lucro</h1>
          <p className="text-gray-600">Análise completa de margem e lucratividade dos produtos</p>
        </div>
        
        <Button onClick={fetchRelatorioLucro} className="bg-blue-600 hover:bg-blue-700">
          <BarChart3 className="mr-2 h-4 w-4" />
          Atualizar Relatório
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Lucro Total</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(relatorioLucro.resumo.lucro_total_geral)}
                </p>
                <p className="text-xs text-green-200 mt-1">
                  Margem: {formatPercent(relatorioLucro.resumo.margem_media)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Valor de Custo</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(relatorioLucro.resumo.valor_custo_total)}
                </p>
                <p className="text-xs text-blue-200 mt-1">Total investido</p>
              </div>
              <Calculator className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Valor de Venda</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(relatorioLucro.resumo.valor_venda_total)}
                </p>
                <p className="text-xs text-purple-200 mt-1">Potencial faturamento</p>
              </div>
              <Target className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Total Produtos</p>
                <p className="text-2xl font-bold">
                  {relatorioLucro.resumo.total_produtos}
                </p>
                <p className="text-xs text-orange-200 mt-1">Com precificação</p>
              </div>
              <Package className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mais-lucrativos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mais-lucrativos">Mais Lucrativos</TabsTrigger>
          <TabsTrigger value="menor-margem">Menor Margem</TabsTrigger>
          <TabsTrigger value="todos">Todos os Produtos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mais-lucrativos" className="space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                Top 10 Produtos Mais Lucrativos
              </CardTitle>
              <CardDescription>
                Produtos que geram mais lucro total em estoque
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {relatorioLucro.top_lucrativos.map((produto, index) => (
                  <div key={produto.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-800 rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{produto.nome}</h4>
                        <p className="text-sm text-gray-600">
                          {produto.quantidade} un. • Código: {produto.codigo_barras}
                        </p>
                        <div className="flex gap-4 text-xs text-gray-500 mt-1">
                          <span>Custo: {formatCurrency(produto.preco_custo)}</span>
                          <span>Venda: {formatCurrency(produto.preco_venda)}</span>
                          <span>Unit.: {formatCurrency(produto.lucro_unitario)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(produto.lucro_total)}
                      </p>
                      <Badge className={getMargemColor(produto.porcentagem_lucro)}>
                        {formatPercent(produto.porcentagem_lucro)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="menor-margem" className="space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Produtos com Menor Margem de Lucro
              </CardTitle>
              <CardDescription>
                Produtos que precisam de atenção na precificação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {relatorioLucro.menor_lucro.map((produto, index) => (
                  <div key={produto.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-800 rounded-full font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{produto.nome}</h4>
                        <p className="text-sm text-gray-600">
                          {produto.quantidade} un. • Código: {produto.codigo_barras}
                        </p>
                        <div className="flex gap-4 text-xs text-gray-500 mt-1">
                          <span>Custo: {formatCurrency(produto.preco_custo)}</span>
                          <span>Venda: {formatCurrency(produto.preco_venda)}</span>
                          <span>Unit.: {formatCurrency(produto.lucro_unitario)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-800">
                        {formatCurrency(produto.lucro_total)}
                      </p>
                      <Badge className={getMargemColor(produto.porcentagem_lucro)}>
                        {formatPercent(produto.porcentagem_lucro)}
                      </Badge>
                      {produto.porcentagem_lucro < 10 && (
                        <p className="text-xs text-red-600 mt-1">⚠️ Margem baixa</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="todos" className="space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Todos os Produtos por Lucratividade
              </CardTitle>
              <CardDescription>
                Lista completa ordenada por lucro total (top 50)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {relatorioLucro.produtos.map((produto, index) => (
                  <div key={produto.id} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xs text-gray-500 w-6">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{produto.nome}</h4>
                        <p className="text-xs text-gray-500">
                          {produto.quantidade} un. • {produto.codigo_barras}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(produto.lucro_total)}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(produto.lucro_unitario)}/un</p>
                      </div>
                      <Badge className={`${getMargemColor(produto.porcentagem_lucro)} text-xs`}>
                        {formatPercent(produto.porcentagem_lucro)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RelatorioLucro;