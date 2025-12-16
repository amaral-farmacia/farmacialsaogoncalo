import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  BarChart3,
  Calendar,
  FileText,
  Target
} from "lucide-react";
import { toast } from "sonner";

const DRE = ({ user }) => {
  const [dreDiario, setDreDiario] = useState(null);
  const [dreMensal, setDreMensal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchDRE();
  }, []);

  const fetchDRE = async () => {
    try {
      setLoading(true);
      
      // Buscar DRE diário
      const dreDiarioResponse = await axios.get('/relatorios/dre', {
        params: { tipo: 'diario', data: dataSelecionada }
      });
      setDreDiario(dreDiarioResponse.data);
      
      // Buscar DRE mensal
      const dreMensalResponse = await axios.get('/relatorios/dre', {
        params: { tipo: 'mensal', data: mesSelecionado }
      });
      setDreMensal(dreMensalResponse.data);
      
    } catch (error) {
      toast.error('Erro ao carregar DRE');
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

  const getResultadoColor = (valor) => {
    if (valor > 0) return 'text-green-600 bg-green-50';
    if (valor < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const renderDRE = (dre, tipo) => {
    if (!dre) return null;

    return (
      <div className="space-y-6">
        {/* Resumo com Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs">Receita Líquida</p>
                  <p className="text-lg font-bold">{formatCurrency(dre.dre.receita_liquida)}</p>
                </div>
                <DollarSign className="h-6 w-6 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs">CPV</p>
                  <p className="text-lg font-bold">{formatCurrency(dre.dre.custo_produtos_vendidos)}</p>
                </div>
                <Calculator className="h-6 w-6 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs">Lucro Bruto</p>
                  <p className="text-lg font-bold">{formatCurrency(dre.dre.lucro_bruto)}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${dre.dre.resultado_liquido >= 0 ? 'from-purple-500 to-purple-600' : 'from-red-500 to-red-600'} text-white border-0`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${dre.dre.resultado_liquido >= 0 ? 'text-purple-100' : 'text-red-100'} text-xs`}>Resultado Líquido</p>
                  <p className="text-lg font-bold">{formatCurrency(dre.dre.resultado_liquido)}</p>
                </div>
                <Target className="h-6 w-6 text-white opacity-75" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DRE Detalhada */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              DRE - Demonstração do Resultado do Exercício
            </CardTitle>
            <CardDescription>
              {tipo === 'diario' ? `Dia: ${new Date(dre.periodo.data).toLocaleDateString('pt-BR')}` : 
               `Mês: ${dre.periodo.data}`} • {dre.indicadores.total_transacoes} transações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              
              {/* Receitas */}
              <div className="border-b pb-3">
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-900">RECEITA BRUTA</span>
                  <span className="font-bold">{formatCurrency(dre.dre.receita_bruta)}</span>
                </div>
                <div className="flex justify-between items-center py-1 text-sm text-gray-600 ml-4">
                  <span>(-) Deduções da Receita</span>
                  <span>({formatCurrency(dre.dre.deducoes_receita)})</span>
                </div>
                <div className="flex justify-between items-center py-2 font-semibold bg-blue-50 px-3 rounded">
                  <span>RECEITA LÍQUIDA</span>
                  <span>{formatCurrency(dre.dre.receita_liquida)}</span>
                </div>
              </div>

              {/* Custos */}
              <div className="border-b pb-3">
                <div className="flex justify-between items-center py-2">
                  <span>(-) Custo dos Produtos Vendidos (CPV)</span>
                  <span>({formatCurrency(dre.dre.custo_produtos_vendidos)})</span>
                </div>
                <div className="flex justify-between items-center py-2 font-semibold bg-green-50 px-3 rounded">
                  <span>LUCRO BRUTO</span>
                  <span>{formatCurrency(dre.dre.lucro_bruto)}</span>
                </div>
              </div>

              {/* Despesas Operacionais */}
              <div className="border-b pb-3">
                <div className="font-semibold text-gray-900 py-2">DESPESAS OPERACIONAIS</div>
                <div className="ml-4 space-y-1 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span>Despesas Administrativas</span>
                    <span>({formatCurrency(dre.dre.despesas_operacionais.administrativas)})</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span>Despesas de Vendas</span>
                    <span>({formatCurrency(dre.dre.despesas_operacionais.vendas)})</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span>Despesas Financeiras</span>
                    <span>({formatCurrency(dre.dre.despesas_operacionais.financeiras)})</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span>Outras Despesas</span>
                    <span>({formatCurrency(dre.dre.despesas_operacionais.outras)})</span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 font-semibold bg-orange-50 px-3 rounded mt-2">
                  <span>Total Despesas Operacionais</span>
                  <span>({formatCurrency(dre.dre.despesas_operacionais.total)})</span>
                </div>
              </div>

              {/* Resultado Final */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 font-semibold">
                  <span>RESULTADO OPERACIONAL</span>
                  <span className={dre.dre.resultado_operacional >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(dre.dre.resultado_operacional)}
                  </span>
                </div>
                <div className={`flex justify-between items-center py-3 font-bold text-lg px-4 rounded ${getResultadoColor(dre.dre.resultado_liquido)}`}>
                  <span>RESULTADO LÍQUIDO</span>
                  <span>{formatCurrency(dre.dre.resultado_liquido)}</span>
                </div>
              </div>

              {/* Indicadores */}
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <h4 className="font-semibold mb-3">Indicadores de Performance</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">Margem Bruta</p>
                    <p className="font-bold text-lg">{formatPercent(dre.indicadores.margem_bruta)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Margem Operacional</p>
                    <p className="font-bold text-lg">{formatPercent(dre.indicadores.margem_operacional)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Margem Líquida</p>
                    <p className="font-bold text-lg">{formatPercent(dre.indicadores.margem_liquida)}</p>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DRE - Demonstração do Resultado</h1>
          <p className="text-gray-600">Análise financeira diária e mensal da operação</p>
        </div>
        
        <Button onClick={fetchDRE} className="bg-blue-600 hover:bg-blue-700">
          <BarChart3 className="mr-2 h-4 w-4" />
          Atualizar DRE
        </Button>
      </div>

      <Tabs defaultValue="mensal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mensal">DRE Mensal</TabsTrigger>
          <TabsTrigger value="diario">DRE Diário</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mensal" className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-gray-500" />
                <label className="text-sm font-medium">Selecionar Mês:</label>
                <input
                  type="month"
                  value={mesSelecionado}
                  onChange={(e) => {
                    setMesSelecionado(e.target.value);
                    // Auto-atualizar quando mudar o mês
                    setTimeout(() => fetchDRE(), 100);
                  }}
                  className="border rounded px-3 py-1"
                />
              </div>
            </CardContent>
          </Card>
          {renderDRE(dreMensal, 'mensal')}
        </TabsContent>
        
        <TabsContent value="diario" className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Calendar className="h-5 w-5 text-gray-500" />
                <label className="text-sm font-medium">Selecionar Data:</label>
                <input
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => {
                    setDataSelecionada(e.target.value);
                    // Auto-atualizar quando mudar a data
                    setTimeout(() => fetchDRE(), 100);
                  }}
                  className="border rounded px-3 py-1"
                />
              </div>
            </CardContent>
          </Card>
          {renderDRE(dreDiario, 'diario')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DRE;