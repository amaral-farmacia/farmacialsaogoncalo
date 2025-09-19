import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Calculator,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  Banknote,
  CreditCard,
  Smartphone,
  Receipt
} from "lucide-react";

const FechamentoCaixa = ({ user }) => {
  const [fechamento, setFechamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataFechamento, setDataFechamento] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchFechamento();
  }, [dataFechamento]);

  const fetchFechamento = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/caixa/fechamento/${dataFechamento}`);
      setFechamento(response.data);
    } catch (error) {
      console.error('Erro ao carregar fechamento');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'dinheiro': return <Banknote className="w-5 h-5" />;
      case 'pix': return <Smartphone className="w-5 h-5" />;
      case 'debito':
      case 'credito': return <CreditCard className="w-5 h-5" />;
      default: return <DollarSign className="w-5 h-5" />;
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Fechamento de Caixa</h1>
        <input
          type="date"
          value={dataFechamento}
          onChange={(e) => setDataFechamento(e.target.value)}
          className="p-2 border rounded"
        />
      </div>

      {fechamento && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recebimentos */}
          <Card className="shadow-lg">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recebimentos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Object.entries(fechamento.recebimentos).map(([method, value]) => (
                  <div key={method} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getPaymentIcon(method)}
                      <span className="font-medium capitalize">{method}</span>
                    </div>
                    <span className="font-bold text-green-700">{formatCurrency(value)}</span>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold text-green-800">
                    <span>Total Recebido:</span>
                    <span>{formatCurrency(fechamento.total_recebimentos)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pagamentos */}
          <Card className="shadow-lg">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-800 flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Object.entries(fechamento.pagamentos).map(([fornecedor, valor]) => (
                  <div key={fornecedor} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5" />
                      <span className="font-medium">{fornecedor}</span>
                    </div>
                    <span className="font-bold text-red-700">{formatCurrency(valor)}</span>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-bold text-red-800">
                    <span>Total Pago:</span>
                    <span>{formatCurrency(fechamento.total_pagamentos)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FechamentoCaixa;