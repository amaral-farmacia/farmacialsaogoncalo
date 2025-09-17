import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, Cross, Lock, User } from "lucide-react";

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const success = await onLogin(credentials.username, credentials.password);
    
    if (!success) {
      setLoading(false);
    }
  };

  const handleDemoLogin = (username, password) => {
    setCredentials({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23059669' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      <div className="w-full max-w-md space-y-6 relative">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl shadow-lg">
            <Pharmacy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema Farmácia</h1>
            <p className="text-gray-600">Faça login para acessar o sistema</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl text-gray-800">Entrar</CardTitle>
            <CardDescription>Digite suas credenciais para continuar</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                  Usuário
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    className="pl-10 h-12 bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="pl-10 h-12 bg-white border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-4 text-center">Credenciais de demonstração:</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 p-3 rounded-lg border border-emerald-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-emerald-800">Administrador</p>
                      <p className="text-sm text-emerald-600">admin / admin123</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDemoLogin("admin", "admin123")}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    >
                      Usar
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-blue-800">Colaborador</p>
                      <p className="text-sm text-blue-600">colab1 / 123456</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDemoLogin("colab1", "123456")}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      Usar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Sistema de Gestão Farmacêutica</p>
          <p className="mt-1">© 2024 - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
};

export default Login;