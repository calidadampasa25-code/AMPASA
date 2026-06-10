export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Error de autenticación</h1>
        <p className="text-gray-600 mb-8">No se pudo completar el inicio de sesión. Por favor, inténtalo de nuevo.</p>
        <a 
          href="/login"
          className="px-8 py-4 bg-orange-600 text-white font-medium rounded-2xl hover:bg-orange-700"
        >
          Volver a Iniciar Sesión
        </a>
      </div>
    </div>
  )
}