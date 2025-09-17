import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  Percent, 
  Plus, 
  Edit,
  Trash2,
  Calendar,
  Target,
  Gift,
  TrendingUp,
  Users,
  Package
} from "lucide-react";
import { toast } from "sonner";

const Promocoes = ({ user }) => {
  const [promocoes, setPromocoes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "desconto_percentual", // desconto_percentual, desconto_valor, leve_pague
    valor: "",
    produto_ids: [],
    data_inicio: "",
    data_fim: "",
    ativo: true,
    condicoes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [produtosResponse] = await Promise.all([
        axios.get('/produtos')
      ]);
      
      setProdutos(produtosResponse.data);
      
      // Simular promoções existentes
      setPromocoes([
        {
          id: "1",
          nome: "Desconto Paracetamol",
          tipo: "desconto_percentual",
          valor: 15,
          data_inicio: "2025-09-01",
          data_fim: "2025-09-30",
          ativo: true,
          produto_ids: ["945f8dd4-7f11-4609-b589-b79136878813"],
          condicoes: "Válido para compras acima de R$ 10,00",
          vendas_promocao: 23,
          economia_gerada: 89.50
        },
        {
          id: "2",
          nome: "Leve 3 Pague 2 - Dipirona",
          tipo: "leve_pague",
          valor: "3x2",
          data_inicio: "2025-09-15",
          data_fim: "2025-10-15",
          ativo: true,
          produto_ids: ["22600072-ff7f-406b-82c8-c545c99f1631"],
          condicoes: "Leve 3 unidades e pague apenas 2",
          vendas_promocao: 8,
          economia_gerada: 71.20
        }
      ]);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const novaPromocao = {
        ...formData,
        id: Date.now().toString(),
        vendas_promocao: 0,
        economia_gerada: 0
      };
      
      setPromocoes([...promocoes, novaPromocao]);
      toast.success('Promoção criada com sucesso');
      
      setFormData({
        nome: "",
        tipo: "desconto_percentual",
        valor: "",
        produto_ids: [],
        data_inicio: "",
        data_fim: "",
        ativo: true,
        condicoes: ""
      });
      setDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao criar promoção');
    }
  };

  const togglePromocao = (id) => {
    setPromocoes(promocoes.map(promo => 
      promo.id === id ? { ...promo, ativo: !promo.ativo } : promo
    ));
    toast.success('Status da promoção atualizado');
  };

  const deletePromocao = (id) => {
    setPromocoes(promocoes.filter(promo => promo.id !== id));
    toast.success('Promoção removida');
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

  const getTipoLabel = (tipo) => {
    switch (tipo) {
      case 'desconto_percentual': return 'Desconto %';
      case 'desconto_valor': return 'Desconto R$';
      case 'leve_pague': return 'Leve X Pague Y';
      default: return tipo;
    }
  };

  const getStatusColor = (ativo) => {
    return ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const isPromocaoVencida = (dataFim) => {
    return new Date(dataFim) < new Date();
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

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Promoções e Descontos</h1>
          <p className="text-gray-600">Gerencie campanhas promocionais e aumente as vendas</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Nova Promoção
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Promoção</DialogTitle>
              <DialogDescription>
                Configure uma nova campanha promocional
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Promoção *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Desconto Setembro"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Promoção *</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({...formData, tipo: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desconto_percentual">Desconto Percentual (%)</SelectItem>
                    <SelectItem value="desconto_valor">Desconto em Valor (R$)</SelectItem>
                    <SelectItem value="leve_pague">Leve X Pague Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="valor">Valor do Desconto *</Label>
                <Input
                  id="valor"
                  value={formData.valor}
                  onChange={(e) => setFormData({...formData, valor: e.target.value})}
                  placeholder={formData.tipo === 'leve_pague' ? 'Ex: 3x2' : 'Ex: 15'}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data Início *</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({...formData, data_inicio: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data Fim *</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({...formData, data_fim: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="condicoes">Condições da Promoção</Label>
                <Input
                  id="condicoes"
                  value={formData.condicoes}
                  onChange={(e) => setFormData({...formData, condicoes: e.target.value})}
                  placeholder="Ex: Válido para compras acima de R$ 50,00"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                  Criar Promoção
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Promoções Ativas</p>
                <p className="text-2xl font-bold">{promocoes.filter(p => p.ativo).length}</p>
              </div>
              <Percent className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Vendas Promocionais</p>
                <p className="text-2xl font-bold">
                  {promocoes.reduce((acc, p) => acc + p.vendas_promocao, 0)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Economia Gerada</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(promocoes.reduce((acc, p) => acc + p.economia_gerada, 0))}
                </p>
              </div>
              <Gift className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Conversão Média</p>
                <p className="text-2xl font-bold">73%</p>
              </div>
              <Target className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Promoções */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promocoes.map((promocao) => {
          const vencida = isPromocaoVencida(promocao.data_fim);
          
          return (
            <Card key={promocao.id} className="shadow-lg border-0 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-gray-900">
                    {promocao.nome}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(promocao.ativo && !vencida)}>
                      {vencida ? 'Vencida' : promocao.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  {getTipoLabel(promocao.tipo)}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Valor da Promoção */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-purple-700 mb-1">Desconto</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {promocao.tipo === 'desconto_percentual' ? `${promocao.valor}%` : 
                       promocao.tipo === 'desconto_valor' ? formatCurrency(promocao.valor) :
                       promocao.valor}
                    </p>
                  </div>
                </div>
                
                {/* Período */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(promocao.data_inicio)} - {formatDate(promocao.data_fim)}
                    </span>
                  </div>
                </div>
                
                {/* Condições */}
                {promocao.condicoes && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">{promocao.condicoes}</p>
                  </div>
                )}
                
                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="font-semibold text-green-800">{promocao.vendas_promocao}</p>
                    <p className="text-green-600">Vendas</p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="font-semibold text-blue-800">{formatCurrency(promocao.economia_gerada)}</p>
                    <p className="text-blue-600">Economia</p>
                  </div>
                </div>
                
                {/* Ações */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePromocao(promocao.id)}
                    className="flex-1"
                    disabled={vencida}
                  >
                    {promocao.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deletePromocao(promocao.id)}
                    className="w-10 h-8 p-0 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {promocoes.length === 0 && !loading && (
        <div className="text-center py-12">
          <Percent className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma promoção cadastrada</h3>
          <p className="text-gray-600 mb-6">Crie sua primeira campanha promocional</p>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Promoção
          </Button>
        </div>
      )}
    </div>
  );
};

export default Promocoes;