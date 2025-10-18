import TextInput from "./TextInput";
import { Link, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { LuEye } from "react-icons/lu";
import { LuEyeClosed } from "react-icons/lu";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const passwordRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const togglePass = () => {
    setPasswordVisible((prev) => !prev);
  };

  const handleSignUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="bg-gray-800 flex h-screen">
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center space-y-4 w-full max-w-sm mb-20">
            <h2 className="text-white text-2xl font-bold mb-6">
              {" "}
              Create an account
            </h2>
            <TextInput
              ref={emailRef}
              className=""
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  passwordRef.current?.focus();
                }
              }}
            />
            <div className="relative mb-4">
              <TextInput
                ref={passwordRef}
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
                placeholder="Create A Password"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSignUp();
                  }
                }}
              />
              <button
                className="icon absolute right-2  top-1/2 -translate-y-1/2"
                tabIndex={0}
                onClick={togglePass}
              >
                {passwordVisible ? (
                  <LuEye size={25} />
                ) : (
                  <LuEyeClosed size={25} />
                )}
              </button>
            </div>

            <button
              className={`button ${loading ? "opacity-50" : ""}`}
              type="submit"
              onClick={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <span className="animate-spin h-5 w-5 duration-200 border-2 border-t-transparent border-white rounded-full"></span>
              ) : (
                <span>Sign Up</span>
              )}
            </button>
            {error ? (
              <span className="text-red-600 font-bold flex flex-col">
                Error signing up. Try again
              </span>
            ) : (
              ""
            )}
            <p className="text-white text-sm mt-4">
              Already have an account?
              <span className="text-blue-500 ml-2 cursor-pointer hover:underline">
                <Link to="/signin"> Log In Here </Link>
              </span>
            </p>
          </div>
        </main>
      </div>
    </>
  );
};

export default Signup;
