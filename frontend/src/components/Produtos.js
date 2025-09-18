import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  Calendar,
  MapPin,
  BarChart3,
  Edit,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

const Produtos = ({ user }) => {
  const [produtos, setProdutos] = useState([]);
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [formData, setFormData] = useState({
    nome: "",
    codigo_barras: "",
    validade: "",
    preco: "",
    quantidade: "",
    localizacao: ""
  });

  useEffect(() => {
    fetchProdutos();
  }, []);

  useEffect(() => {
    const filtered = produtos.filter(produto =>
      produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      produto.codigo_barras.includes(searchTerm)
    );
    setFilteredProdutos(filtered);
  }, [produtos, searchTerm]);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/produtos');
      const produtosOrdenados = response.data.sort((a, b) => a.nome.localeCompare(b.nome));
      setProdutos(produtosOrdenados);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const produtoData = {
        ...formData,
        preco: parseFloat(formData.preco),
        quantidade: parseInt(formData.quantidade)
      };
      
      await axios.post('/produtos', produtoData);
      toast.success('Produto cadastrado com sucesso');
      
      setFormData({
        nome: "",
        codigo_barras: "",
        validade: "",
        preco: "",
        quantidade: "",
        localizacao: ""
      });
      setDialogOpen(false);
      fetchProdutos();
    } catch (error) {
      toast.error('Erro ao cadastrar produto');
    }
  };

  const isVencendoEm3Meses = (validade) => {
    const hoje = new Date();
    const dataValidade = new Date(validade);
    const diffMeses = (dataValidade.getFullYear() - hoje.getFullYear()) * 12 + 
                      (dataValidade.getMonth() - hoje.getMonth());
    return diffMeses <= 3;
  };

  const getStatusEstoque = (quantidade) => {
    if (quantidade === 0) return { text: 'Sem estoque', color: 'bg-red-100 text-red-800' };
    if (quantidade <= 10) return { text: 'Estoque baixo', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Em estoque', color: 'bg-green-100 text-green-800' };
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Produtos</h1>
          <p className="text-gray-600">Gerencie o estoque da farmácia</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg">
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Produto</DialogTitle>
              <DialogDescription>
                Adicione um novo produto ao estoque
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Produto *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: Paracetamol 500mg"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="codigo_barras">Código de Barras *</Label>
                <Input
                  id="codigo_barras"
                  value={formData.codigo_barras}
                  onChange={(e) => setFormData({...formData, codigo_barras: e.target.value})}
                  placeholder="Ex: 7896333123456"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preco">Preço (R$) *</Label>
                  <Input
                    id="preco"
                    type="number"
                    step="0.01"
                    value={formData.preco}
                    onChange={(e) => setFormData({...formData, preco: e.target.value})}
                    placeholder="0,00"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="validade">Data de Validade *</Label>
                <Input
                  id="validade"
                  type="date"
                  value={formData.validade}
                  onChange={(e) => setFormData({...formData, validade: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localização *</Label>
                <Input
                  id="localizacao"
                  value={formData.localizacao}
                  onChange={(e) => setFormData({...formData, localizacao: e.target.value})}
                  placeholder="Ex: A1, B3, G5"
                  required
                />
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
                placeholder="Buscar produto por nome ou código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-cyan-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Total Produtos</p>
                <p className="text-2xl font-bold">{produtos.length}</p>
              </div>
              <Package className="h-8 w-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProdutos.map((produto) => {
          const statusEstoque = getStatusEstoque(produto.quantidade);
          const vencendoEm3Meses = isVencendoEm3Meses(produto.validade);
          
          return (
            <Card key={produto.id} className="shadow-lg border-0 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-gray-900 line-clamp-2">
                    {produto.nome}
                  </CardTitle>
                  {vencendoEm3Meses && (
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 ml-2" />
                  )}
                </div>
                <CardDescription className="text-sm text-gray-600">
                  Código: {produto.codigo_barras}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                {/* Price */}
                <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 p-3 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-900">
                    {formatCurrency(produto.preco)}
                  </p>
                </div>
                
                {/* Stock Status */}
                <div className="flex justify-between items-center">
                  <Badge className={statusEstoque.color}>
                    {statusEstoque.text}
                  </Badge>
                  <span className="text-lg font-semibold text-gray-700">
                    {produto.quantidade} un.
                  </span>
                </div>
                
                {/* Location and Expiry */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Localização: {produto.localizacao}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className={vencendoEm3Meses ? 'text-amber-600 font-medium' : ''}>
                      Validade: {formatDate(produto.validade)}
                    </span>
                  </div>
                </div>
                
                {/* Alerts */}
                {vencendoEm3Meses && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-800 font-medium">
                        Vence em breve
                      </span>
                    </div>
                  </div>
                )}
                
                {produto.quantidade <= 10 && produto.quantidade > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800 font-medium">
                        Estoque baixo
                      </span>
                    </div>
                  </div>
                )}
                
                {produto.quantidade === 0 && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800 font-medium">
                        Sem estoque
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProdutos.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm 
              ? 'Tente buscar com outros termos'
              : 'Cadastre o primeiro produto para começar'
            }
          </p>
          {!searchTerm && (
            <Button 
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Produto
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Produtos;