import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { 
  Users, 
  Plus, 
  Search, 
  Phone,
  CreditCard,
  DollarSign,
  Calendar,
  AlertCircle,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";

const Clientes = ({ user }) => {
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [fiadoDialogOpen, setFiadoDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [fiados, setFiados] = useState([]);
  const [valorPagamento, setValorPagamento] = useState("");
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    telefone: ""
  });

  useEffect(() => {
    fetchClientes();
    fetchFiados();
  }, []);

  useEffect(() => {
    const filtered = clientes.filter(cliente =>
      cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.cpf.includes(searchTerm) ||
      cliente.telefone.includes(searchTerm)
    );
    setFilteredClientes(filtered);
  }, [clientes, searchTerm]);

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/clientes');
      const clientesOrdenados = response.data.sort((a, b) => a.nome.localeCompare(b.nome));
      setClientes(clientesOrdenados);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiados = async () => {
    try {
      const response = await axios.get('/fiados');
      setFiados(response.data);
    } catch (error) {
      toast.error('Erro ao carregar fiados');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação básica de CPF (apenas formato)
    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
    if (!cpfRegex.test(formData.cpf)) {
      toast.error('CPF deve estar no formato 000.000.000-00');
      return;
    }
    
    // Validação básica de telefone
    const telefoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
    if (!telefoneRegex.test(formData.telefone)) {
      toast.error('Telefone deve estar no formato (00) 00000-0000');
      return;
    }
    
    try {
      await axios.post('/clientes', formData);
      toast.success('Cliente cadastrado com sucesso');
      
      setFormData({
        nome: "",
        cpf: "",
        telefone: ""
      });
      setDialogOpen(false);
      fetchClientes();
    } catch (error) {
      toast.error('Erro ao cadastrar cliente');
    }
  };

  const handlePagamentoFiado = async (fiadoId) => {
    if (!valorPagamento || parseFloat(valorPagamento) <= 0) {
      toast.error('Digite um valor válido');
      return;
    }
    
    try {
      await axios.post(`/fiados/${fiadoId}/pagar`, {
        valor: parseFloat(valorPagamento)
      });
      
      toast.success('Pagamento registrado com sucesso');
      setValorPagamento("");
      setFiadoDialogOpen(false);
      setSelectedCliente(null);
      fetchClientes();
      fetchFiados();
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatCPF = (cpf) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  const getStatusFiado = (valor) => {
    if (valor === 0) return { text: 'Sem pendências', color: 'bg-green-100 text-green-800' };
    if (valor <= 50) return { text: 'Valor baixo', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Pendente', color: 'bg-red-100 text-red-800' };
  };

  const getFiadosCliente = (clienteId) => {
    return fiados.filter(fiado => fiado.cliente_id === clienteId && fiado.status !== 'pago');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clientes</h1>
          <p className="text-gray-600">Gerencie os clientes e controle de fiados</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Cliente</DialogTitle>
              <DialogDescription>
                Adicione um novo cliente ao sistema
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Maria Silva Santos"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
                <p className="text-xs text-gray-500">Formato: 000.000.000-00</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
                <p className="text-xs text-gray-500">Formato: (00) 00000-0000</p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
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

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 shadow-lg border-0">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar cliente por nome, CPF ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Clientes</p>
                <p className="text-2xl font-bold">{clientes.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClientes.map((cliente) => {
          const statusFiado = getStatusFiado(cliente.fiado_total);
          const fiadosCliente = getFiadosCliente(cliente.id);
          
          return (
            <Card key={cliente.id} className="shadow-lg border-0 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-emerald-600" />
                    {cliente.nome}
                  </CardTitle>
                  {cliente.fiado_total > 0 && (
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>{cliente.cpf}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{cliente.telefone}</span>
                  </div>
                </div>
                
                {/* Fiado Status */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Valor em Fiado</span>
                    <Badge className={statusFiado.color}>
                      {statusFiado.text}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(cliente.fiado_total)}
                  </p>
                </div>
                
                {/* Action Buttons */}
                {cliente.fiado_total > 0 && (
                  <div className="pt-2">
                    <Button
                      onClick={() => {
                        setSelectedCliente(cliente);
                        setFiadoDialogOpen(true);
                      }}
                      variant="outline"
                      className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Receber Pagamento
                    </Button>
                  </div>
                )}
                
                {/* Registration Date */}
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-200">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Cliente desde {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Dialog */}
      <Dialog open={fiadoDialogOpen} onOpenChange={setFiadoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receber Pagamento</DialogTitle>
            <DialogDescription>
              {selectedCliente && `Registrar pagamento de ${selectedCliente.nome}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCliente && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Valor total em fiado:</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(selectedCliente.fiado_total)}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="valor_pagamento">Valor do Pagamento *</Label>
                <Input
                  id="valor_pagamento"
                  type="number"
                  step="0.01"
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(e.target.value)}
                  placeholder="0,00"
                  max={selectedCliente.fiado_total}
                />
                <p className="text-xs text-gray-500">
                  Máximo: {formatCurrency(selectedCliente.fiado_total)}
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    const fiadosCliente = getFiadosCliente(selectedCliente.id);
                    if (fiadosCliente.length > 0) {
                      handlePagamentoFiado(fiadosCliente[0].id);
                    }
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={!valorPagamento || parseFloat(valorPagamento) <= 0}
                >
                  Registrar Pagamento
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setFiadoDialogOpen(false);
                    setSelectedCliente(null);
                    setValorPagamento("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filteredClientes.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Tente buscar com outros termos'
              : 'Cadastre o primeiro cliente para começar'
            }
          </p>
          {!searchTerm && (
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Cliente
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Clientes;