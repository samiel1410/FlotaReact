import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
// No longer using LoginPage.css, fully relying on Tailwind CSS

export const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const triggerShake = () => {
    setShakeForm(true);
    setTimeout(() => setShakeForm(false), 600);
  };

  const onSubmit = async (data) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      toast.loading('Iniciando sesión...', { id: 'login-toast' });
      
      const result = await login(data.usuario, data.clave);

      if (result.success) {
        toast.dismiss('login-toast');
        navigate('/');
      } else {
        toast.error(result.message || 'Credenciales inválidas', { id: 'login-toast' });
        triggerShake();
      }

    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error inesperado.', { id: 'login-toast' });
      triggerShake();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden font-outfit bg-slate-50">
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Outfit, sans-serif', borderRadius: '12px' } }} />
      
      {/* Lado Izquierdo: Branding Visual (Tailwind) */}
      <div className="relative hidden lg:flex flex-1 items-center justify-center bg-[url('/images/fondo.jpg')] bg-cover bg-center overflow-hidden">
        {/* Overlay con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-blue-900/60 z-0"></div>
        
        {/* Contenido Decorativo */}
        <div className="relative z-10 max-w-xl p-12 text-white animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-blue-500/20 rounded-full border border-blue-400/30 backdrop-blur-sm">
            <i className="fas fa-bus text-blue-400"></i>
            <span className="text-sm font-semibold tracking-wider text-blue-100 uppercase">SistemaFlota</span>
          </div>
          
          <h1 className="text-5xl font-bold leading-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
            SISTEMA de<br />
            <span className="text-blue-400">GESTIÓN</span>
          </h1>
          
          <p className="text-lg text-slate-200 leading-relaxed mb-10">
            Plataforma integral para el control de envíos, boletería y rastreo de encomiendas en tiempo real, brindando seguridad y eficiencia.
          </p>
          
          <ul className="space-y-6">
            <li className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/20 backdrop-blur-md">
                <i className="fas fa-file-invoice-dollar text-xl"></i>
              </div>
              <div>
                <strong className="block text-white font-medium">Facturación Electrónica</strong>
                <span className="text-sm text-slate-300">SRI autorizado, emisión inmediata</span>
              </div>
            </li>
            <li className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/20 backdrop-blur-md">
                <i className="fas fa-map-marked-alt text-xl"></i>
              </div>
              <div>
                <strong className="block text-white font-medium">Rastreo de Guías</strong>
                <span className="text-sm text-slate-300">Seguimiento en tiempo real</span>
              </div>
            </li>
            <li className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/20 backdrop-blur-md">
                <i className="fas fa-ticket-alt text-xl"></i>
              </div>
              <div>
                <strong className="block text-white font-medium">Boletería Integrada</strong>
                <span className="text-sm text-slate-300">Venta y control de asientos</span>
              </div>
            </li>
          </ul>
        </div>
        
        {/* Adornos Flotantes SVG (Opcional, para darle un toque premium) */}
        <div className="absolute top-10 right-10 opacity-20 animate-float">
          <i className="fas fa-route text-9xl text-white"></i>
        </div>
      </div>

      {/* Lado Derecho: Formulario (Tailwind) */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white lg:rounded-l-3xl shadow-[-20px_0_50px_rgba(0,0,0,0.05)] z-10">
        <div className={`w-full max-w-md animate-slide-left ${shakeForm ? 'animate-shake' : ''}`}>
          
          <div className="text-center sm:text-left mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 rounded-2xl shadow-sm border border-slate-100 mb-6">
              <img src="/images/transpaeasy.png" alt="Logo" className="w-14 h-auto object-contain" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Bienvenido</h2>
            <p className="text-slate-500">Por favor, ingresa tus credenciales</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {/* Input Usuario */}
            <div className="space-y-2">
              <label htmlFor="usuario" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Usuario
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <i className="fas fa-user-circle text-lg"></i>
                </div>
                <input 
                  id="usuario" 
                  type="text" 
                  className={`block w-full pl-11 pr-4 py-3.5 text-slate-900 bg-slate-50 border-2 rounded-xl focus:outline-none focus:bg-white transition-all ${
                    errors.usuario 
                      ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                      : 'border-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }`}
                  placeholder="Ej. juan.perez" 
                  autoComplete="username"
                  {...register("usuario", { required: true })}
                />
              </div>
              {errors.usuario && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1 animate-fade-up">
                  <i className="fas fa-exclamation-circle"></i> Usuario requerido
                </p>
              )}
            </div>

            {/* Input Contraseña */}
            <div className="space-y-2">
              <label htmlFor="clave" className="block text-xs font-bold text-slate-700 tracking-wide uppercase">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <i className="fas fa-lock text-lg"></i>
                </div>
                <input 
                  id="clave" 
                  type={showPassword ? "text" : "password"} 
                  className={`block w-full pl-11 pr-12 py-3.5 text-slate-900 bg-slate-50 border-2 rounded-xl focus:outline-none focus:bg-white transition-all ${
                    errors.clave 
                      ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                      : 'border-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                  }`}
                  placeholder="••••••••" 
                  autoComplete="current-password"
                  {...register("clave", { required: true })}
                />
                <button 
                  type="button" 
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-blue-600 transition-colors outline-none focus:text-blue-600"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
                </button>
              </div>
              {errors.clave && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1 mt-1 animate-fade-up">
                  <i className="fas fa-exclamation-circle"></i> Contraseña requerida
                </p>
              )}
            </div>

            {/* Botón Submit */}
            <button 
              type="submit" 
              className="group relative w-full flex items-center justify-center gap-3 py-4 px-6 text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/30 rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-600/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-circle-notch fa-spin text-lg"></i>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} Sistema de Gestión Integral
              <br />
              Desarrollado por <span className="text-slate-600 font-bold">EasyPlus</span>
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
};
