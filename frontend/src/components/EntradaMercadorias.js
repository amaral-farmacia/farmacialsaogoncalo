import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  Package,
  Plus,
  Search,
  Calculator,
  TrendingUp,
  Scan,
  ShoppingBag,
  DollarSign,
  Percent,
  CheckCircle,
  AlertCircle,
  Save,
  Download,
  Upload
} from "lucide-react";
import { toast } from "sonner";

const EntradaMercadorias = ({ user }) => {
  const [produtos, setProdutos] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [codigoBarras, setCodigoBarras] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modoEntradaRapida, setModoEntradaRapida] = useState(true);
  const inputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    quantidade: "",
    preco_custo: "",
    preco_venda: "",
    data_validade: "",
    localizacao: "",
    lote: "",
    fornecedor: ""
  });

  useEffect(() => {
    fetchProdutos();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const fetchProdutos = async () => {
    try {
      const response = await axios.get('/produtos');
      setProdutos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    }
  };

  const buscarProduto = async () => {
    if (!codigoBarras.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/produtos/buscar/${codigoBarras}`);
      const produto = response.data;
      
      setProdutoSelecionado(produto);
      setFormData({
        quantidade: "1",
        preco_custo: produto.preco_custo?.toString() || "",
        preco_venda: produto.preco?.toString() || "",
        data_validade: produto.validade || "",
        localizacao: produto.localizacao || "",
        lote: "",
        fornecedor: ""
      });
      
      if (modoEntradaRapida) {
        setDialogOpen(true);
      }
      
      setCodigoBarras("");
      toast.success(`Produto encontrado: ${produto.nome}`);
    } catch (error) {
      toast.error('Produto não encontrado');
      setCodigoBarras("");
    } finally {
      setLoading(false);
    }
  };

  const adicionarEntrada = async () => {
    if (!produtoSelecionado) {
      toast.error('Selecione um produto');
      return;
    }

    const quantidade = parseInt(formData.quantidade);
    const precoCusto = parseFloat(formData.preco_custo);
    const precoVenda = parseFloat(formData.preco_venda);
    
    if (!quantidade || !precoCusto || !precoVenda) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // Registrar entrada
      const entradaData = {
        produto_id: produtoSelecionado.id,
        produto_nome: produtoSelecionado.nome,
        codigo_barras: produtoSelecionado.codigo_barras,
        quantidade: quantidade,
        preco_custo: precoCusto,
        preco_venda: precoVenda,
        data_validade: formData.data_validade,
        localizacao: formData.localizacao,
        lote: formData.lote,
        fornecedor: formData.fornecedor,
        margem_lucro: ((precoVenda - precoCusto) / precoCusto * 100),
        lucro_unitario: precoVenda - precoCusto,
        valor_total_custo: quantidade * precoCusto,
        valor_total_venda: quantidade * precoVenda
      };

      await axios.post('/entradas', entradaData);
      
      // Adicionar à lista local
      setEntradas([entradaData, ...entradas]);
      
      toast.success(`Entrada registrada: +${quantidade} unidades`);
      
      // Resetar formulário
      setProdutoSelecionado(null);
      setFormData({
        quantidade: "",
        preco_custo: "",
        preco_venda: "",
        data_validade: "",
        localizacao: "",
        lote: "",
        fornecedor: ""
      });
      setDialogOpen(false);
      
      // Focar novamente no input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      
    } catch (error) {
      toast.error('Erro ao registrar entrada');
    }
  };

  const calcularMargem = () => {
    const custo = parseFloat(formData.preco_custo) || 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    
    if (custo === 0) return 0;
    return ((venda - custo) / custo * 100);
  };

  const calcularLucroUnitario = () => {
    const custo = parseFloat(formData.preco_custo) || 0;
    const venda = parseFloat(formData.preco_venda) || 0;
    return venda - custo;
  };

  const sugerirPrecoVenda = () => {
    const custo = parseFloat(formData.preco_custo) || 0;
    if (custo > 0) {
      const precoSugerido = custo * 1.3; // Margem de 30%
      setFormData({...formData, preco_venda: precoSugerido.toFixed(2)});
    }
  };

  const finalizarEntradas = async () => {
    if (entradas.length === 0) {
      toast.error('Nenhuma entrada para finalizar');
      return;
    }

    try {
      await axios.post('/entradas-mercadorias/finalizar', { entradas });
      toast.success(`${entradas.length} entradas finalizadas e estoque atualizado!`);
      setEntradas([]);
      fetchProdutos();
    } catch (error) {
      toast.error('Erro ao finalizar entradas');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getMargemColor = (margem) => {
    if (margem < 10) return 'text-red-600';
    if (margem < 20) return 'text-orange-600';
    if (margem < 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const totalEntradasCusto = entradas.reduce((acc, entrada) => acc + entrada.valor_total_custo, 0);
  const totalEntradasVenda = entradas.reduce((acc, entrada) => acc + entrada.valor_total_venda, 0);
  const lucroTotalEntradas = totalEntradasVenda - totalEntradasCusto;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Entrada de Mercadorias</h1>
          <p className="text-gray-600">Registre entrada de produtos e controle custos</p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant={modoEntradaRapida ? "default" : "outline"}
            onClick={() => setModoEntradaRapida(!modoEntradaRapida)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Scan className="mr-2 h-4 w-4" />
            Modo Rápido: {modoEntradaRapida ? "ON" : "OFF"}
          </Button>
          
          {entradas.length > 0 && (
            <Button onClick={finalizarEntradas} className="bg-green-600 hover:bg-green-700">
              <Save className="mr-2 h-4 w-4" />
              Finalizar Entradas ({entradas.length})
            </Button>
          )}
        </div>
      </div>

      {/* Scanner de Código de Barras */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-blue-600" />
            Scanner de Produtos
          </CardTitle>
          <CardDescription>
            Escaneie o código de barras para entrada rápida
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Escaneie ou digite o código de barras"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  buscarProduto();
                }
              }}
              className="text-lg h-12"
              disabled={loading}
            />
            <Button
              onClick={buscarProduto}
              disabled={loading || !codigoBarras.trim()}
              className="bg-blue-600 hover:bg-blue-700 h-12 px-6"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Entradas Pendentes */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-green-600" />
                Entradas Pendentes ({entradas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {entradas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Nenhuma entrada pendente</p>
                  <p className="text-sm">Escaneie produtos para começar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {entradas.map((entrada, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{entrada.produto_nome}</h3>
                          <p className="text-sm text-gray-600">Código: {entrada.codigo_barras}</p>
                          {entrada.lote && <p className="text-xs text-gray-500">Lote: {entrada.lote}</p>}
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          +{entrada.quantidade} un.
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-red-50 p-3 rounded">
                          <p className="text-red-700 text-xs">Custo Unit.</p>
                          <p className="font-semibold text-red-800">{formatCurrency(entrada.preco_custo)}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-green-700 text-xs">Venda Unit.</p>
                          <p className="font-semibold text-green-800">{formatCurrency(entrada.preco_venda)}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded">
                          <p className="text-blue-700 text-xs">Lucro Unit.</p>
                          <p className="font-semibold text-blue-800">{formatCurrency(entrada.lucro_unitario)}</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded">
                          <p className="text-purple-700 text-xs">Margem</p>
                          <p className={`font-semibold ${getMargemColor(entrada.margem_lucro)}`}>
                            {entrada.margem_lucro.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                        <div className="text-sm text-gray-600">
                          <span>Total: </span>
                          <span className="font-semibold">Custo {formatCurrency(entrada.valor_total_custo)}</span>
                          <span> → </span>
                          <span className="font-semibold text-green-600">Venda {formatCurrency(entrada.valor_total_venda)}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEntradas(entradas.filter((_, i) => i !== index));
                            toast.success('Entrada removida');
                          }}
                          className="text-red-600 hover:bg-red-50"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumo e Controles */}
        <div className="space-y-6">
          {/* Resumo Financeiro */}
          <Card className="shadow-lg border-0 sticky top-6">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-600" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {entradas.length > 0 ? (
                <>
                  <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <div className="text-center">
                        <p className="text-sm text-red-700 mb-1">Total Investido</p>
                        <p className="text-2xl font-bold text-red-900">
                          {formatCurrency(totalEntradasCusto)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="text-center">
                        <p className="text-sm text-green-700 mb-1">Receita Potencial</p>
                        <p className="text-2xl font-bold text-green-900">
                          {formatCurrency(totalEntradasVenda)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="text-center">
                        <p className="text-sm text-blue-700 mb-1">Lucro Potencial</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {formatCurrency(lucroTotalEntradas)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="text-center">
                        <p className="text-sm text-purple-700 mb-1">Margem Média</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {totalEntradasCusto > 0 ? ((lucroTotalEntradas / totalEntradasCusto) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={finalizarEntradas}
                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Finalizar {entradas.length} Entrada(s)
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Escaneie produtos para ver o resumo</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entrada Manual Rápida */}
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                Entrada Manual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Button
                onClick={() => {
                  setProdutoSelecionado({ nome: "Produto Manual", codigo_barras: "MANUAL" });
                  setFormData({
                    quantidade: "1",
                    preco_custo: "",
                    preco_venda: "",
                    data_validade: "",
                    localizacao: "",
                    lote: "",
                    fornecedor: ""
                  });
                  setDialogOpen(true);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Produto Manual
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de Entrada */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Registrar Entrada
            </DialogTitle>
            <DialogDescription>
              {produtoSelecionado && `Produto: ${produtoSelecionado.nome}`}
            </DialogDescription>
          </DialogHeader>
          
          {produtoSelecionado && (
            <div className="space-y-6">
              {/* Informações do Produto */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{produtoSelecionado.nome}</h3>
                <p className="text-sm text-gray-600">Código: {produtoSelecionado.codigo_barras}</p>
                <p className="text-sm text-gray-600">Estoque atual: {produtoSelecionado.quantidade} unidades</p>
                {produtoSelecionado.preco_custo > 0 && (
                  <p className="text-sm text-blue-600">Último custo: {formatCurrency(produtoSelecionado.preco_custo)}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quantidade e Localização */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantidade">Quantidade *</Label>
                    <Input
                      id="quantidade"
                      type="number"
                      value={formData.quantidade}
                      onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
                      placeholder="1"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="localizacao">Localização</Label>
                    <Input
                      id="localizacao"
                      value={formData.localizacao}
                      onChange={(e) => setFormData({...formData, localizacao: e.target.value})}
                      placeholder="Ex: A1, B3"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lote">Lote</Label>
                    <Input
                      id="lote"
                      value={formData.lote}
                      onChange={(e) => setFormData({...formData, lote: e.target.value})}
                      placeholder="Número do lote"
                    />
                  </div>
                </div>
                
                {/* Preços e Cálculos */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="preco_custo">Preço de Custo (R$) *</Label>
                    <Input
                      id="preco_custo"
                      type="number"
                      step="0.01"
                      value={formData.preco_custo}
                      onChange={(e) => setFormData({...formData, preco_custo: e.target.value})}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="preco_venda">Preço de Venda (R$) *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="preco_venda"
                        type="number"
                        step="0.01"
                        value={formData.preco_venda}
                        onChange={(e) => setFormData({...formData, preco_venda: e.target.value})}
                        placeholder="0,00"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={sugerirPrecoVenda}
                        className="px-3"
                        title="Sugerir preço com 30% de margem"
                      >
                        <Calculator className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="data_validade">Data de Validade</Label>
                    <Input
                      id="data_validade"
                      type="date"
                      value={formData.data_validade}
                      onChange={(e) => setFormData({...formData, data_validade: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                  placeholder="Nome do fornecedor"
                />
              </div>
              
              {/* Cálculos em Tempo Real */}
              {formData.preco_custo && formData.preco_venda && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-lg border border-emerald-200">
                  <h3 className="font-semibold text-emerald-800 mb-3">Cálculos Automáticos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-emerald-700">Lucro Unitário:</p>
                      <p className="font-semibold text-emerald-900">
                        {formatCurrency(calcularLucroUnitario())}
                      </p>
                    </div>
                    <div>
                      <p className="text-emerald-700">Margem:</p>
                      <p className={`font-semibold ${getMargemColor(calcularMargem())}`}>
                        {calcularMargem().toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-emerald-700">Lucro Total:</p>
                      <p className="font-semibold text-emerald-900">
                        {formatCurrency(calcularLucroUnitario() * (parseInt(formData.quantidade) || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={adicionarEntrada}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={!formData.quantidade || !formData.preco_custo || !formData.preco_venda}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Entrada
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setDialogOpen(false);
                    setProdutoSelecionado(null);
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
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

export default EntradaMercadorias;