import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  Receipt,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Building,
  CreditCard,
  Eye,
  Edit,
  Trash2,
  Filter,
  Download
} from "lucide-react";
import { toast } from "sonner";

const Boletos = ({ user }) => {
  const [boletos, setBoletos] = useState([]);
  const [filteredBoletos, setFilteredBoletos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [boletoSelecionado, setBoletoSelecionado] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [formData, setFormData] = useState({
    fornecedor: "",
    valor: "",
    data_vencimento: "",
    descricao: "",
    categoria: "medicamentos",
    numero_boleto: "",
    codigo_barras: ""
  });

  useEffect(() => {
    fetchBoletos();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [boletos, filtroStatus]);

  const fetchBoletos = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/boletos');
      setBoletos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar boletos');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let filtered = boletos;
    
    if (filtroStatus !== "todos") {
      filtered = boletos.filter(boleto => boleto.status === filtroStatus);
    }
    
    setFilteredBoletos(filtered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const boletoData = {
        ...formData,
        valor: parseFloat(formData.valor)
      };
      
      await axios.post('/boletos', boletoData);
      toast.success('Boleto cadastrado com sucesso');
      
      setFormData({
        fornecedor: "",
        valor: "",
        data_vencimento: "",
        descricao: "",
        categoria: "medicamentos",
        numero_boleto: "",
        codigo_barras: ""
      });
      setDialogOpen(false);
      fetchBoletos();
    } catch (error) {
      toast.error('Erro ao cadastrar boleto');
    }
  };

  const marcarComoPago = async (boleto) => {
    try {
      await axios.put(`/boletos/${boleto.id}/pagar`, {
        data_pagamento: new Date().toISOString().split('T')[0],
        valor_pago: boleto.valor
      });
      
      toast.success('Boleto marcado como pago');
      fetchBoletos();
      setPagamentoDialogOpen(false);
      setBoletoSelecionado(null);
    } catch (error) {
      toast.error('Erro ao marcar boleto como pago');
    }
  };

  const abrirEdicao = (boleto) => {
    setBoletoSelecionado(boleto);
    setFormData({
      fornecedor: boleto.fornecedor,
      valor: boleto.valor.toString(),
      data_vencimento: boleto.data_vencimento,
      descricao: boleto.descricao,
      categoria: boleto.categoria,
      numero_boleto: boleto.numero_boleto,
      codigo_barras: boleto.codigo_barras || ""
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const boletoData = {
        ...formData,
        valor: parseFloat(formData.valor)
      };
      
      await axios.put(`/boletos/${boletoSelecionado.id}`, boletoData);
      toast.success('Boleto atualizado com sucesso');
      
      setEditDialogOpen(false);
      setBoletoSelecionado(null);
      setFormData({
        fornecedor: "",
        valor: "",
        data_vencimento: "",
        descricao: "",
        categoria: "medicamentos",
        numero_boleto: "",
        codigo_barras: ""
      });
      fetchBoletos();
    } catch (error) {
      toast.error('Erro ao atualizar boleto');
    }
  };

  const confirmarDelete = (boleto) => {
    setBoletoSelecionado(boleto);
    setDeleteDialogOpen(true);
  };

  const deletarBoleto = async () => {
    try {
      await axios.delete(`/boletos/${boletoSelecionado.id}`);
      toast.success('Boleto deletado com sucesso');
      setDeleteDialogOpen(false);
      setBoletoSelecionado(null);
      fetchBoletos();
    } catch (error) {
      toast.error('Erro ao deletar boleto');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status, dataVencimento) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    
    if (status === 'pago') return 'bg-blue-100 text-blue-800';
    if (vencimento < hoje) return 'bg-red-100 text-red-800';
    return 'bg-orange-100 text-orange-800';
  };

  const getStatusLabel = (status, dataVencimento) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    
    if (status === 'pago') return 'Pago';
    if (vencimento < hoje) return 'Vencido';
    return 'A Pagar';
  };

  const getStatusIcon = (status, dataVencimento) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    
    if (status === 'pago') return <CheckCircle className="h-4 w-4" />;
    if (vencimento < hoje) return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getTotaisPorStatus = () => {
    const hoje = new Date();
    
    const totais = {
      vencidos: { count: 0, valor: 0 },
      aPagar: { count: 0, valor: 0 },
      pagos: { count: 0, valor: 0 }
    };

    boletos.forEach(boleto => {
      const vencimento = new Date(boleto.data_vencimento);
      
      if (boleto.status === 'pago') {
        totais.pagos.count++;
        totais.pagos.valor += boleto.valor;
      } else if (vencimento < hoje) {
        totais.vencidos.count++;
        totais.vencidos.valor += boleto.valor;
      } else {
        totais.aPagar.count++;
        totais.aPagar.valor += boleto.valor;
      }
    });

    return totais;
  };

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

  const totais = getTotaisPorStatus();

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Controle de Boletos</h1>
          <p className="text-gray-600">Gerencie boletos, vencimentos e pagamentos</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Novo Boleto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Boleto</DialogTitle>
              <DialogDescription>
                Adicione um novo boleto para controle
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor/Empresa *</Label>
                <Input
                  id="fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                  placeholder="Ex: Cimed, Boticário"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    placeholder="0,00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data_vencimento">Vencimento *</Label>
                  <Input
                    id="data_vencimento"
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) => setFormData({...formData, data_vencimento: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={formData.categoria} onValueChange={(value) => setFormData({...formData, categoria: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medicamentos">Medicamentos</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="servicos">Serviços</SelectItem>
                    <SelectItem value="impostos">Impostos</SelectItem>
                    <SelectItem value="aluguel">Aluguel</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="numero_boleto">Número do Boleto</Label>
                <Input
                  id="numero_boleto"
                  value={formData.numero_boleto}
                  onChange={(e) => setFormData({...formData, numero_boleto: e.target.value})}
                  placeholder="Ex: 123456789"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Descrição do boleto"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                  Cadastrar
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Vencidos</p>
                <p className="text-2xl font-bold">{totais.vencidos.count}</p>
                <p className="text-red-200 text-sm">{formatCurrency(totais.vencidos.valor)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">A Pagar</p>
                <p className="text-2xl font-bold">{totais.aPagar.count}</p>
                <p className="text-orange-200 text-sm">{formatCurrency(totais.aPagar.valor)}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Pagos</p>
                <p className="text-2xl font-bold">{totais.pagos.count}</p>
                <p className="text-blue-200 text-sm">{formatCurrency(totais.pagos.valor)}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="shadow-lg border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os boletos</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
                <SelectItem value="pendente">A Pagar</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-gray-600">
              {filteredBoletos.length} boleto(s) encontrado(s)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Boletos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBoletos.map((boleto) => {
          const hoje = new Date();
          const vencimento = new Date(boleto.data_vencimento);
          const diasVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
          
          return (
            <Card key={boleto.id} className="shadow-lg border-0 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-green-600" />
                    {boleto.fornecedor}
                  </CardTitle>
                  <Badge className={getStatusColor(boleto.status, boleto.data_vencimento)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(boleto.status, boleto.data_vencimento)}
                      {getStatusLabel(boleto.status, boleto.data_vencimento)}
                    </span>
                  </Badge>
                </div>
                {boleto.numero_boleto && (
                  <CardDescription>Boleto: {boleto.numero_boleto}</CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Valor */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-green-700 mb-1">Valor</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(boleto.valor)}
                    </p>
                  </div>
                </div>
                
                {/* Informações */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Vencimento: {formatDate(boleto.data_vencimento)}</span>
                  </div>
                  
                  {boleto.status !== 'pago' && diasVencimento <= 7 && diasVencimento >= 0 && (
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Vence em {diasVencimento} dia(s)</span>
                    </div>
                  )}
                  
                  {boleto.status !== 'pago' && diasVencimento < 0 && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Vencido há {Math.abs(diasVencimento)} dia(s)</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>Categoria: {boleto.categoria}</span>
                  </div>
                </div>
                
                {boleto.descricao && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">{boleto.descricao}</p>
                  </div>
                )}
                
                {/* Ações */}
                <div className="flex gap-2">
                  {boleto.status !== 'pago' && (
                    <Button
                      onClick={() => {
                        setBoletoSelecionado(boleto);
                        setPagamentoDialogOpen(true);
                      }}
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pagar
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-10 h-8 p-0"
                    onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
                
                {boleto.status === 'pago' && boleto.data_pagamento && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Pago em:</strong> {formatDate(boleto.data_pagamento)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de Pagamento */}
      <Dialog open={pagamentoDialogOpen} onOpenChange={setPagamentoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              {boletoSelecionado && `Marcar boleto de ${boletoSelecionado.fornecedor} como pago`}
            </DialogDescription>
          </DialogHeader>
          
          {boletoSelecionado && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Valor a pagar:</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(boletoSelecionado.valor)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Fornecedor: {boletoSelecionado.fornecedor}
                </p>
                <p className="text-sm text-gray-600">
                  Vencimento: {formatDate(boletoSelecionado.data_vencimento)}
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => marcarComoPago(boletoSelecionado)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Pagamento
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setPagamentoDialogOpen(false);
                    setBoletoSelecionado(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filteredBoletos.length === 0 && !loading && (
        <div className="text-center py-12">
          <Receipt className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filtroStatus === "todos" ? 'Nenhum boleto cadastrado' : `Nenhum boleto ${filtroStatus}`}
          </h3>
          <p className="text-gray-600 mb-6">
            {filtroStatus === "todos" ? 'Cadastre o primeiro boleto para começar' : 'Altere o filtro para ver outros boletos'}
          </p>
          {filtroStatus === "todos" && (
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Boleto
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Boletos;