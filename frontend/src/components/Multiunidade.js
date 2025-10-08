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
  Building2,
  Plus,
  MapPin,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Eye,
  Settings,
  BarChart3,
  Phone
} from "lucide-react";
import { toast } from "sonner";

const Multiunidade = ({ user }) => {
  const [unidades, setUnidades] = useState([]);
  const [unidadeAtual, setUnidadeAtual] = useState(null);
  const [consolidado, setConsolidado] = useState({
    total_vendas: 0,
    total_produtos: 0,
    total_clientes: 0,
    fiados_pendentes: 0
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    endereco: "",
    telefone: "",
    email: "",
    cnpj: "",
    responsavel: "",
    ativa: true
  });

  useEffect(() => {
    if (user.role !== 'admin') {
      toast.error('Acesso negado. Apenas administradores podem gerenciar unidades.');
      return;
    }
    fetchUnidades();
    fetchConsolidado();
  }, [user]);

  const fetchUnidades = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/unidades');
      setUnidades(response.data);
      
      // Definir unidade atual
      const atual = response.data.find(u => u.id === user.unidade_id);
      setUnidadeAtual(atual);
    } catch (error) {
      toast.error('Erro ao carregar unidades');
    } finally {
      setLoading(false);
    }
  };

  const fetchConsolidado = async () => {
    try {
      const response = await axios.get('/dashboard/consolidado');
      setConsolidado(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados consolidados');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post('/unidades', formData);
      toast.success('Unidade criada com sucesso');
      
      setFormData({
        nome: "",
        endereco: "",
        telefone: "",
        email: "",
        cnpj: "",
        responsavel: "",
        ativa: true
      });
      setDialogOpen(false);
      fetchUnidades();
      fetchConsolidado();
    } catch (error) {
      toast.error('Erro ao criar unidade');
    }
  };

  const visualizarDetalhes = async (unidade) => {
    try {
      const response = await axios.get(`/unidades/${unidade.id}/detalhes`);
      setUnidadeSelecionada({...unidade, detalhes: response.data});
      setDetalhesDialogOpen(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes da unidade');
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
      case 'ativa': return 'bg-green-100 text-green-800';
      case 'inativa': return 'bg-red-100 text-red-800';
      case 'manutencao': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (user.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <Building2 className="h-16 w-16 mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
        <p className="text-gray-600">Apenas administradores podem gerenciar multiunidade.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão Multiunidade</h1>
          <p className="text-gray-600">Gerencie todas as unidades da farmácia</p>
          {unidadeAtual && (
            <Badge className="mt-2 bg-emerald-100 text-emerald-800">
              Unidade Atual: {unidadeAtual.nome}
            </Badge>
          )}
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Nova Unidade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Unidade</DialogTitle>
              <DialogDescription>
                Adicione uma nova unidade da farmácia
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Unidade *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Farmácia São Gonçalo - Centro"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço *</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                  placeholder="Rua, número, bairro, cidade"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável</Label>
                <Input
                  id="responsavel"
                  value={formData.responsavel}
                  onChange={(e) => setFormData({...formData, responsavel: e.target.value})}
                  placeholder="Nome do responsável"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                  Criar Unidade
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard Consolidado */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle className="flex items-center gap-2 text-indigo-800">
            <BarChart3 className="h-5 w-5" />
            Visão Consolidada - Todas as Unidades
          </CardTitle>
          <CardDescription className="text-indigo-700">
            Resumo geral do desempenho de todas as unidades
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Vendas Totais</p>
                  <p className="text-2xl font-bold">{formatCurrency(consolidado.total_vendas)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Produtos</p>
                  <p className="text-2xl font-bold">{consolidado.total_produtos}</p>
                </div>
                <Package className="h-8 w-8 text-blue-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Clientes</p>
                  <p className="text-2xl font-bold">{consolidado.total_clientes}</p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Unidades Ativas</p>
                  <p className="text-2xl font-bold">{unidades.filter(u => u.status === 'ativa').length}</p>
                </div>
                <Building2 className="h-8 w-8 text-amber-200" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Unidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {unidades.map((unidade) => {
          const isUnidadeAtual = unidade.id === user.unidade_id;
          
          return (
            <Card key={unidade.id} className="shadow-lg border-0 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    {unidade.nome}
                    {isUnidadeAtual && <span className="text-sm text-emerald-600">(Atual)</span>}
                  </CardTitle>
                  <Badge className={getStatusColor(unidade.status)}>
                    {unidade.status === 'ativa' ? 'Ativa' : 
                     unidade.status === 'inativa' ? 'Inativa' : 'Manutenção'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Informações da Unidade */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-2">{unidade.endereco}</span>
                  </div>
                  
                  {unidade.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{unidade.telefone}</span>
                    </div>
                  )}
                  
                  {unidade.responsavel && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{unidade.responsavel}</span>
                    </div>
                  )}
                </div>
                
                {/* Estatísticas Rápidas */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-center text-sm">
                    <div>
                      <p className="font-semibold text-gray-800">{unidade.estatisticas?.produtos || 0}</p>
                      <p className="text-gray-600">Produtos</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{unidade.estatisticas?.clientes || 0}</p>
                      <p className="text-gray-600">Clientes</p>
                    </div>
                  </div>
                </div>
                
                {/* Ações */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => visualizarDetalhes(unidade)}
                    className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                    onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de Detalhes da Unidade */}
      <Dialog open={detalhesDialogOpen} onOpenChange={setDetalhesDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Detalhes da Unidade
            </DialogTitle>
            <DialogDescription>
              {unidadeSelecionada && `Informações detalhadas de ${unidadeSelecionada.nome}`}
            </DialogDescription>
          </DialogHeader>
          
          {unidadeSelecionada && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Informações Gerais</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Nome:</span>
                      <span className="font-medium ml-2">{unidadeSelecionada.nome}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Endereço:</span>
                      <span className="font-medium ml-2">{unidadeSelecionada.endereco}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Telefone:</span>
                      <span className="font-medium ml-2">{unidadeSelecionada.telefone}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Responsável:</span>
                      <span className="font-medium ml-2">{unidadeSelecionada.responsavel}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900">Estatísticas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {unidadeSelecionada.detalhes?.produtos || 0}
                      </p>
                      <p className="text-sm text-blue-700">Produtos</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {unidadeSelecionada.detalhes?.clientes || 0}
                      </p>
                      <p className="text-sm text-green-700">Clientes</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => setDetalhesDialogOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {unidades.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma unidade cadastrada</h3>
          <p className="text-gray-600 mb-6">Crie a primeira unidade para começar</p>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeira Unidade
          </Button>
        </div>
      )}
    </div>
  );
};

export default Multiunidade;