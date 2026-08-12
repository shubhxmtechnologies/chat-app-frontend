import {
    useEffect,
    useRef,
    useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { Skeleton } from "./ui/skeleton";

import { createOrGetChat } from "../api/chat.api";

import {
    searchUsers,
    type SearchUser,
} from "../api/user.api";

import { useDebounce } from "../hooks/useDebounce";

const UserSearch = () => {
    const navigate = useNavigate();
    const [query, setQuery] =
        useState("");
    const [openingChat, setOpeningChat] =
        useState<string | null>(null);
    const [results, setResults] =
        useState<SearchUser[]>([]);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const debouncedQuery =
        useDebounce(query, 350);

    const controllerRef =
        useRef<AbortController | null>(
            null
        );

    useEffect(() => {
        if (
            debouncedQuery.trim().length < 2
        ) {
            controllerRef.current?.abort();

            setResults([]);
            setError("");
            setLoading(false);

            return;
        }

        controllerRef.current?.abort();

        const controller =
            new AbortController();

        controllerRef.current =
            controller;

        const loadUsers = async () => {
            try {
                setLoading(true);
                setError("");

                const users =
                    await searchUsers(
                        debouncedQuery.trim(),
                        controller.signal
                    );

                setResults(users);
            } catch (error) {
                if (
                    controller.signal.aborted
                ) {
                    return;
                }

                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError(
                        "Failed to search users"
                    );
                }

                setResults([]);
            } finally {
                if (
                    !controller.signal.aborted
                ) {
                    setLoading(false);
                }
            }
        };

        void loadUsers();

        return () => {
            controller.abort();
        };
    }, [debouncedQuery]);

    return (
        <div>
            <input
                type="text"
                placeholder="Search users..."
                value={query}
                onChange={(e) =>
                    setQuery(e.target.value)
                }
                className="w-full p-2 border rounded mb-4"
            />

            {loading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2">
                            <Skeleton className="size-10 rounded-full" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
            )}

            {error && <p className="text-red-500 text-sm p-2">{error}</p>}

            {!loading &&
                results.map((user) => (
                    <button
                        disabled={openingChat === user._id}
                        key={user._id}
                        type="button"
                        onClick={async () => {
                            try {
                                setOpeningChat(user._id);
                                const chat =
                                    await createOrGetChat(user._id);

                                navigate(
                                    `/chats/${chat._id}`
                                );
                            } catch (error) {
                                if (error instanceof Error) {
                                    setError(error.message);
                                } else {
                                    setError(
                                        "Failed to open chat"
                                    );
                                }
                            } finally {
                                setOpeningChat(null);
                            }
                        }}
                    >
                        <img
                            src={
                                user.avatarUrl ??
                                "/default-avatar.png"
                            }
                            alt={
                                user.username
                            }
                            width={40}
                            height={40}
                        />

                        <span>
                            {user.username}
                        </span>
                    </button>
                ))}
        </div>
    );
};

export default UserSearch;