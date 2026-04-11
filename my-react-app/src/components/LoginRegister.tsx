import { useState } from "react";
//import LoginPage from './assets/pages/LoginPage'
//import RegisterPage from './assets/pages/RegisterPage'

function LoginRegister() {
    const [page, setPage] = useState<"login"|"register">("login");

    return (
        //{page === "login" && <LoginPage/>}
        //{page === "register" && <RegisterPage/>}

        <div>
            <button /*onClick={() => setPage(page === "login" ? "register" : "login")}*/ className='px-8 py-3 bg-yellow-400 text-black border-2 border-black font-black hover:shadow-none hover:translate-x- hover:translate-y- transition-all text-xs tracking-[0.2em]'>
                {/*page === "login" ? "Register" : "Login"*/}
            </button>
        </div>
    )
}

export default LoginRegister