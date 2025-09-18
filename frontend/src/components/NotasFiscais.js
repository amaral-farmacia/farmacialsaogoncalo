import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  FileText,
  Upload,
  Scan,
  Download,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Package,
  Calendar,
  Building,
  Eye,
  Trash2,
  Calculator,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";

const NotasFiscais = ({ user }) => {
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [arquivo, setArquivo] = useState(null);
  const [dadosExtraidos, setDadosExtraidos] = useState(null);
  const [produtosParaCadastro, setProdutosParaCadastro] = useState([]);

  useEffect(() => {
    fetchNotasFiscais();
  }, []);

  const fetchNotasFiscais = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/notas-fiscais');
      setNotasFiscais(response.data);
    } catch (error) {
      toast.error('Erro ao carregar notas fiscais');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/xml', 'text/xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use PDF, XML ou imagem.');
      return;
    }

    setArquivo(file);
    setUploadLoading(true);

    try {
      const formData = new FormData();
      formData.append('arquivo', file);

      const response = await axios.post('/notas-fiscais/extrair', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setDadosExtraidos(response.data);
      setProdutosParaCadastro(response.data.produtos || []);
      toast.success('Dados extraídos com sucesso!');
    } catch (error) {
      toast.error('Erro ao processar nota fiscal');
    } finally {
      setUploadLoading(false);
    }
  };

  const confirmarCadastro = async () => {
    try {
      const payload = {
        ...dadosExtraidos,
        produtos: produtosParaCadastro,
        arquivo_nome: arquivo.name
      };

      await axios.post('/notas-fiscais', payload);
      toast.success('Nota fiscal processada e produtos cadastrados!');
      
      setDialogOpen(false);
      setDadosExtraidos(null);
      setProdutosParaCadastro([]);
      setArquivo(null);
      fetchNotasFiscais();
    } catch (error) {
      toast.error('Erro ao salvar nota fiscal');
    }
  };

  const calcularLucroTotal = (produtos) => {
    return produtos.reduce((total, produto) => {
      const lucroUnitario = produto.preco_venda - produto.preco_custo;
      return total + (lucroUnitario * produto.quantidade);
    }, 0);
  };

  const calcularMargemLucro = (precoVenda, precoCusto) => {
    if (precoCusto === 0) return 0;
    return ((precoVenda - precoCusto) / precoCusto) * 100;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processada': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'erro': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notas Fiscais</h1>
          <p className="text-gray-600">Leia e processe notas fiscais automaticamente</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 shadow-lg">
              <Upload className="mr-2 h-4 w-4" />
              Nova Nota Fiscal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Processar Nota Fiscal
              </DialogTitle>
              <DialogDescription>
                Faça upload da nota fiscal para extrair dados automaticamente
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload & Extração</TabsTrigger>
                <TabsTrigger value="dados" disabled={!dadosExtraidos}>Dados Extraídos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 bg-purple-50">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                    <h3 className="text-lg font-semibold mb-2">Upload da Nota Fiscal</h3>
                    <p className="text-gray-600 mb-4">
                      Formatos aceitos: PDF, XML, JPEG, PNG
                    </p>
                    
                    <Input
                      type="file"
                      accept=".pdf,.xml,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button
                        type="button"
                        disabled={uploadLoading}
                        className="bg-purple-600 hover:bg-purple-700"
                        asChild
                      >
                        <span>
                          {uploadLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processando...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Selecionar Arquivo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                    
                    {arquivo && (
                      <div className="mt-4 p-3 bg-white rounded border">
                        <p className="text-sm text-gray-700">
                          <strong>Arquivo:</strong> {arquivo.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Tamanho:</strong> {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="dados" className="space-y-4">
                {dadosExtraidos && (
                  <div className="space-y-6">
                    {/* Informações da Nota */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Informações da Nota Fiscal
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Número da Nota</Label>
                          <p className="text-lg font-semibold">{dadosExtraidos.numero || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Fornecedor</Label>
                          <p className="text-lg">{dadosExtraidos.fornecedor || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Data de Emissão</Label>
                          <p className="text-lg">{dadosExtraidos.data_emissao || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Valor Total</Label>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(dadosExtraidos.valor_total || 0)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Lista de Produtos */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Produtos Extraídos ({produtosParaCadastro.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {produtosParaCadastro.map((produto, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                <div className="md:col-span-2">
                                  <p className="font-semibold text-gray-900">{produto.nome}</p>
                                  <p className="text-sm text-gray-600">Código: {produto.codigo}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-gray-600">Quantidade</p>
                                  <p className="font-semibold">{produto.quantidade}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-gray-600">Preço Unitário</p>
                                  <p className="font-semibold text-green-600">
                                    {formatCurrency(produto.preco_unitario)}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Controle de Preço de Venda e Margem */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                                <div>
                                  <Label className="text-sm font-medium">Preço de Custo</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={produto.preco_custo || produto.preco_unitario}
                                    onChange={(e) => {
                                      const novoProdutos = [...produtosParaCadastro];
                                      novoProdutos[index].preco_custo = parseFloat(e.target.value);
                                      setProdutosParaCadastro(novoProdutos);
                                    }}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Preço de Venda</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={produto.preco_venda || produto.preco_unitario * 1.3}
                                    onChange={(e) => {
                                      const novoProdutos = [...produtosParaCadastro];
                                      novoProdutos[index].preco_venda = parseFloat(e.target.value);
                                      setProdutosParaCadastro(novoProdutos);
                                    }}
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Margem de Lucro</Label>
                                  <div className="mt-1 p-2 bg-green-50 rounded border">
                                    <p className="font-semibold text-green-700">
                                      {calcularMargemLucro(
                                        produto.preco_venda || produto.preco_unitario * 1.3,
                                        produto.preco_custo || produto.preco_unitario
                                      ).toFixed(1)}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Resumo Financeiro */}
                        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                          <h3 className="font-semibold text-green-800 mb-3">Resumo Financeiro</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-green-700">Custo Total:</p>
                              <p className="font-semibold text-green-900">
                                {formatCurrency(
                                  produtosParaCadastro.reduce((acc, p) => 
                                    acc + ((p.preco_custo || p.preco_unitario) * p.quantidade), 0
                                  )
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-green-700">Receita Potencial:</p>
                              <p className="font-semibold text-green-900">
                                {formatCurrency(
                                  produtosParaCadastro.reduce((acc, p) => 
                                    acc + ((p.preco_venda || p.preco_unitario * 1.3) * p.quantidade), 0
                                  )
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-green-700">Lucro Potencial:</p>
                              <p className="font-semibold text-green-900">
                                {formatCurrency(calcularLucroTotal(produtosParaCadastro))}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                          <Button
                            onClick={confirmarCadastro}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirmar e Cadastrar Produtos
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setDadosExtraidos(null);
                              setProdutosParaCadastro([]);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Notas Processadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {notasFiscais.map((nota) => (
          <Card key={nota.id} className="shadow-lg border-0 hover:shadow-xl transition-all duration-200 hover:scale-[1.02]">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  NF #{nota.numero}
                </CardTitle>
                <Badge className={getStatusColor(nota.status)}>
                  {nota.status === 'processada' ? 'Processada' :
                   nota.status === 'pendente' ? 'Pendente' : 'Erro'}
                </Badge>
              </div>
              <CardDescription>{nota.fornecedor}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Informações da Nota */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(nota.data_emissao).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span>{nota.total_produtos} produtos</span>
                </div>
              </div>
              
              {/* Valores */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">{formatCurrency(nota.valor_total)}</p>
                    <p className="text-gray-600">Valor Total</p>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">{formatCurrency(nota.lucro_potencial || 0)}</p>
                    <p className="text-gray-600">Lucro Potencial</p>
                  </div>
                </div>
              </div>
              
              {/* Ações */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNotaSelecionada(nota);
                    setDetalhesDialogOpen(true);
                  }}
                  className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-10 h-8 p-0 border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir esta nota?')) {
                      toast.info('Funcionalidade em desenvolvimento');
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Detalhes */}
      <Dialog open={detalhesDialogOpen} onOpenChange={setDetalhesDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes da Nota Fiscal
            </DialogTitle>
            <DialogDescription>
              {notaSelecionada && `NF #${notaSelecionada.numero} - ${notaSelecionada.fornecedor}`}
            </DialogDescription>
          </DialogHeader>
          
          {notaSelecionada && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações da Nota</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Número:</Label>
                      <p className="text-lg font-semibold">{notaSelecionada.numero}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Fornecedor:</Label>
                      <p>{notaSelecionada.fornecedor}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Data de Emissão:</Label>
                      <p>{new Date(notaSelecionada.data_emissao).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Análise Financeira
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded">
                        <p className="text-sm text-blue-700">Valor Total</p>
                        <p className="font-semibold text-blue-900">
                          {formatCurrency(notaSelecionada.valor_total)}
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-sm text-green-700">Lucro Potencial</p>
                        <p className="font-semibold text-green-900">
                          {formatCurrency(notaSelecionada.lucro_potencial || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <p className="text-sm text-purple-700">Margem Média</p>
                      <p className="font-semibold text-purple-900">
                        {((notaSelecionada.lucro_potencial || 0) / notaSelecionada.valor_total * 100).toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setDetalhesDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {notasFiscais.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma nota fiscal processada</h3>
          <p className="text-gray-600 mb-6">Faça upload da primeira nota fiscal para começar</p>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Upload className="mr-2 h-4 w-4" />
            Processar Primeira Nota
          </Button>
        </div>
      )}
    </div>
  );
};

export default NotasFiscais;