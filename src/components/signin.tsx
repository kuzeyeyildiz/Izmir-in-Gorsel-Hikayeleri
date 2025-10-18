import { Link, useNavigate } from "react-router-dom";
import TextInput from "./TextInput";
import { useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { LuEye } from "react-icons/lu";
import { LuEyeClosed } from "react-icons/lu";

const Signin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const togglePass = () => {
    setVisible((prev) => !prev);
  };

  const handleSignIn = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="bg-gray-800 flex h-screen">
      <main className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center space-y-4 w-full max-w-sm mb-20">
          <h2 className="text-white text-2xl font-bold mb-6"> Sign In </h2>
          <TextInput
            ref={emailRef}
            className=""
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Username"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                passwordRef.current?.focus();
              }
            }}
          />
          <div className="relative mb-4">
            <TextInput
              ref={passwordRef}
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              placeholder="Create A Password"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSignIn();
                }
              }}
            />
            <button
              className="icon absolute right-2  top-1/2 -translate-y-1/2"
              tabIndex={0}
              onClick={togglePass}
            >
              {visible ? <LuEye size={25} /> : <LuEyeClosed size={25} />}
            </button>
          </div>
          <button
            className={`button ${loading ? "opacity-50" : ""}`}
            type="submit"
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <span className="animate-spin h-5 w-5 border-2 border-t-transparent border-white rounded-full"></span>
            ) : (
              <span>Log In</span>
            )}
          </button>
          {error ? (
            <span className="flex flex-col text-red-600 font-bold">
              Error signin in. Try again.
            </span>
          ) : (
            ""
          )}
          <p className="text-white text-sm mt-4">
            Don't have an account?
            <span className="text-blue-500 ml-2 cursor-pointer hover:underline">
              <Link to="/signup"> Sign Up Here </Link>
            </span>
          </p>
        </div>
      </main>
    </div>
  );
};
export default Signin;
