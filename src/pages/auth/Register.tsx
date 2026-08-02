import { useState, type FormEvent } from "react";

import {
    Link,
    useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const USERNAME_REGEX =
    /^[A-Za-z0-9_]+$/;

const Register = () => {
    const navigate = useNavigate();

    const { register } = useAuth();

    const [username, setUsername] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [
        confirmPassword,
        setConfirmPassword,
    ] = useState("");

    const [error, setError] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const validate = (): string | null => {
        const trimmed =
            username.trim();

        if (
            trimmed.length < 3 ||
            trimmed.length > 30
        ) {
            return "Username must be between 3 and 30 characters.";
        }

        if (
            !USERNAME_REGEX.test(
                trimmed
            )
        ) {
            return "Username can only contain letters, numbers and underscores.";
        }

        if (password.length < 8) {
            return "Password must be at least 8 characters.";
        }

        if (
            password !==
            confirmPassword
        ) {
            return "Passwords do not match.";
        }

        return null;
    };

    const handleSubmit = async (
        e: FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        setError("");

        const validationError =
            validate();

        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);

        try {
            await register({
                username,
                email,
                password,
            });

            navigate("/", {
                replace: true,
            });
        } catch (error) {
            console.log(error);
            
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError(
                    "Registration failed"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main>
            <h1>Register</h1>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) =>
                        setUsername(
                            e.target.value
                        )
                    }
                    required
                />

                <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) =>
                        setEmail(
                            e.target.value
                        )
                    }
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) =>
                        setPassword(
                            e.target.value
                        )
                    }
                    required
                />

                <input
                    type="password"
                    placeholder="Confirm Password"
                    autoComplete="new-password"
                    value={
                        confirmPassword
                    }
                    onChange={(e) =>
                        setConfirmPassword(
                            e.target.value
                        )
                    }
                    required
                />

                {error && <p>{error}</p>}

                <button
                    disabled={loading}
                    type="submit"
                >
                    {loading
                        ? "Creating account..."
                        : "Register"}
                </button>
            </form>

            <p>
                Already have an account?{" "}
                <Link to="/login">
                    Login
                </Link>
            </p>
        </main>
    );
};

export default Register;