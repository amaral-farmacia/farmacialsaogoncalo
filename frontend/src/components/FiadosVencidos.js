import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  AlertTriangle,
  Clock,
  Calendar,
  Phone,
  DollarSign,
  User,
  CalendarDays,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";

const FiadosVencidos = ({ user }) => {
  const [fiadosData, setFiadosData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogVencimento, setDialogVencimento] = useState(false);
  const [fiadoSelecionado, setFiadoSelecionado] = useState(null);
  const [novaDataVencimento, setNovaDataVencimento] = useState("");

  useEffect(() => {
    fetchFiadosVencidos();
  }, []);

  const fetchFiadosVencidos = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/fiados-vencidos');
      setFiadosData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar fiados vencidos');
    } finally {
      setLoading(false);
    }
  };

  const definirVencimento = async () => {
    if (!fiadoSelecionado || !novaDataVencimento) return;

    try {
      await axios.put(`/fiados/${fiadoSelecionado.id}/definir-vencimento`, {}, {
        params: { data_vencimento: novaDataVencimento }
      });
      
      toast.success('Data de vencimento definida com sucesso');
      setDialogVencimento(false);
      setFiadoSelecionado(null);
      setNovaDataVencimento("");
      fetchFiadosVencidos();
    } catch (error) {
      toast.error('Erro ao definir vencimento');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getAlertColor = (alerta) => {
    if (alerta === "VENCIDO") return "bg-red-100 text-red-800 border-red-200";
    if (alerta === "VENCE HOJE") return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  const getAlertIcon = (alerta) => {
    if (alerta === "VENCIDO") return <AlertTriangle className="h-4 w-4" />;
    if (alerta === "VENCE HOJE") return <Clock className="h-4 w-4" />;
    return <Calendar className="h-4 w-4" />;
  };

  const renderFiadoCard = (fiado) => (
    <Card key={fiado.id} className="shadow-lg border-0 hover:shadow-xl transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" />
              {fiado.cliente_nome}
            </CardTitle>
            <CardDescription className="mt-1">
              {fiado.cliente_telefone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {fiado.cliente_telefone}
                </span>
              )}
            </CardDescription>
          </div>
          <Badge className={getAlertColor(fiado.alerta)}>
            <div className="flex items-center gap-1">
              {getAlertIcon(fiado.alerta)}
              {fiado.alerta}
            </div>
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informações Financeiras */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <p className="text-xs text-red-700 mb-1">Valor Pendente</p>
            <p className="font-bold text-red-900">{formatCurrency(fiado.valor_pendente)}</p>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-xs text-gray-700 mb-1">Valor Pago</p>
            <p className="font-bold text-gray-900">{formatCurrency(fiado.valor_pago)}</p>
          </div>
        </div>
        
        {/* Data de Vencimento */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 mb-1">Data de Vencimento</p>
              <p className="font-semibold text-blue-900">{formatDate(fiado.data_vencimento)}</p>
            </div>
            {fiado.dias_vencido > 0 && (
              <div className="text-right">
                <p className="text-xs text-red-700">Vencido há</p>
                <p className="font-bold text-red-900">{fiado.dias_vencido} dia(s)</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Descrição */}
        {fiado.descricao && (
          <div className="text-sm text-gray-600">
            <p><strong>Descrição:</strong> {fiado.descricao}</p>
          </div>
        )}
        
        {/* Ações */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => {
              setFiadoSelecionado(fiado);
              setNovaDataVencimento(fiado.data_vencimento);
              setDialogVencimento(true);
            }}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Alterar Vencimento
          </Button>
          
          {fiado.cliente_telefone && (
            <Button
              onClick={() => {
                const message = `Olá ${fiado.cliente_nome}, você tem um valor de ${formatCurrency(fiado.valor_pendente)} em aberto na Farmácia São Gonçalo. Vencimento: ${formatDate(fiado.data_vencimento)}. Por favor, compareça para regularizar.`;
                const whatsappUrl = `https://wa.me/55${fiado.cliente_telefone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
              }}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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

  if (!fiadosData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Erro ao carregar dados de fiados vencidos</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fiados Vencidos</h1>
          <p className="text-gray-600">Controle de pagamentos em atraso e vencimentos próximos</p>
        </div>
        
        <Button onClick={fetchFiadosVencidos} className="bg-blue-600 hover:bg-blue-700">
          <Clock className="mr-2 h-4 w-4" />
          Atualizar Lista
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Fiados Vencidos</p>
                <p className="text-2xl font-bold">{fiadosData.resumo.total_vencidos}</p>
                <p className="text-xs text-red-200 mt-1">{formatCurrency(fiadosData.resumo.valor_total_vencido)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Vencem Hoje</p>
                <p className="text-2xl font-bold">{fiadosData.resumo.total_vencem_hoje}</p>
                <p className="text-xs text-orange-200 mt-1">{formatCurrency(fiadosData.resumo.valor_vence_hoje)}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Vencem em 3 Dias</p>
                <p className="text-2xl font-bold">{fiadosData.resumo.total_vencem_3_dias}</p>
                <p className="text-xs text-yellow-200 mt-1">{formatCurrency(fiadosData.resumo.valor_vence_3_dias)}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Geral</p>
                <p className="text-2xl font-bold">
                  {fiadosData.resumo.total_vencidos + fiadosData.resumo.total_vencem_hoje + fiadosData.resumo.total_vencem_3_dias}
                </p>
                <p className="text-xs text-purple-200 mt-1">
                  {formatCurrency(
                    fiadosData.resumo.valor_total_vencido + 
                    fiadosData.resumo.valor_vence_hoje + 
                    fiadosData.resumo.valor_vence_3_dias
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vencidos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vencidos">Vencidos ({fiadosData.resumo.total_vencidos})</TabsTrigger>
          <TabsTrigger value="hoje">Vencem Hoje ({fiadosData.resumo.total_vencem_hoje})</TabsTrigger>
          <TabsTrigger value="proximos">Próximos ({fiadosData.resumo.total_vencem_3_dias})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="vencidos" className="space-y-6">
          {fiadosData.fiados_vencidos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum fiado vencido</h3>
                <p className="text-gray-600">Parabéns! Todos os fiados estão em dia.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fiadosData.fiados_vencidos.map(renderFiadoCard)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="hoje" className="space-y-6">
          {fiadosData.vencem_hoje.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum fiado vence hoje</h3>
                <p className="text-gray-600">Não há cobranças para hoje.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fiadosData.vencem_hoje.map(renderFiadoCard)}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="proximos" className="space-y-6">
          {fiadosData.vencem_em_3_dias.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum fiado vence nos próximos 3 dias</h3>
                <p className="text-gray-600">Agenda tranquila para os próximos dias.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fiadosData.vencem_em_3_dias.map(renderFiadoCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para Definir Vencimento */}
      <Dialog open={dialogVencimento} onOpenChange={setDialogVencimento}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Data de Vencimento</DialogTitle>
            <DialogDescription>
              {fiadoSelecionado && `Definir nova data para ${fiadoSelecionado.cliente_nome}`}
            </DialogDescription>
          </DialogHeader>
          
          {fiadoSelecionado && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm"><strong>Cliente:</strong> {fiadoSelecionado.cliente_nome}</p>
                <p className="text-sm"><strong>Valor:</strong> {formatCurrency(fiadoSelecionado.valor_pendente)}</p>
                <p className="text-sm"><strong>Vencimento atual:</strong> {formatDate(fiadoSelecionado.data_vencimento)}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nova_data">Nova Data de Vencimento</Label>
                <Input
                  id="nova_data"
                  type="date"
                  value={novaDataVencimento}
                  onChange={(e) => setNovaDataVencimento(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={definirVencimento} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Confirmar Nova Data
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDialogVencimento(false);
                    setFiadoSelecionado(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FiadosVencidos;