import {
    useEffect,
    useRef,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createOrGetChat } from "@/api/chat.api";
import { searchUsers, type SearchUser } from "@/api/user.api";
import { useDebounce } from "@/hooks/useDebounce";

const DEFAULT_AVATAR = "https://cutiedp.com/wp-content/uploads/2025/08/no-dp-image-4.webp";

const UserSearch = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [openingChat, setOpeningChat] = useState<string | null>(null);
    const [results, setResults] = useState<SearchUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const debouncedQuery = useDebounce(query, 350);
    const controllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (debouncedQuery.trim().length < 2) {
            controllerRef.current?.abort();
            setResults([]);
            setError("");
            setLoading(false);
            return;
        }

        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        const loadUsers = async () => {
            try {
                setLoading(true);
                setError("");
                const users = await searchUsers(debouncedQuery.trim(), controller.signal);
                setResults(users);
            } catch (err) {
                if (controller.signal.aborted) return;
                setError(err instanceof Error ? err.message : "Failed to search users");
                setResults([]);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void loadUsers();

        return () => {
            controller.abort();
        };
    }, [debouncedQuery]);

    const handleSelectUser = async (userId: string) => {
        try {
            setOpeningChat(userId);
            const chat = await createOrGetChat(userId);
            navigate(`/chats/${chat._id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to open chat");
        } finally {
            setOpeningChat(null);
        }
    };

    return (
        <div className="w-full space-y-3">
            {/* Search Input Bar */}
            <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <textarea
                    name="txt_search_user"
                    id="txt_search_user"
                    rows={1}
                    placeholder="Search people by username..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value.replace(/[\r\n]+/g, ""))}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            if (e.nativeEvent.isComposing) return;
                            e.preventDefault();
                        }
                    }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-1password-ignore="true"
                    data-form-type="other"
                    enterKeyHint="search"
                    role="textbox"
                    className="w-full pl-10 pr-4 py-2.5 min-h-[42px] max-h-[42px] border border-border/80 rounded-xl bg-card text-foreground placeholder:text-muted-foreground outline-none resize-none overflow-hidden text-[16px] sm:text-sm leading-normal focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 shadow-xs transition-all break-words [word-break:normal] [overflow-wrap:anywhere] box-border"
                />
            </div>

            {/* Skeletons when loading */}
            {loading && (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card/60">
                            <Skeleton className="size-10 rounded-full" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <p className="text-xs text-destructive p-2 font-medium bg-destructive/10 border border-destructive/20 rounded-xl">
                    {error}
                </p>
            )}

            {/* Results List */}
            {!loading && results.length > 0 && (
                <div className="space-y-1.5">
                    {results.map((searchUser) => {
                        const isOpening = openingChat === searchUser._id;
                        const displayName = searchUser.name?.firstName
                            ? `${searchUser.name.firstName} ${searchUser.name.lastName || ""}`.trim()
                            : `@${searchUser.username}`;

                        return (
                            <div
                                key={searchUser._id}
                                className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:bg-secondary/70 transition-all duration-150 shadow-2xs group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar className="size-10">
                                        <AvatarImage
                                            src={searchUser.avatarUrl || DEFAULT_AVATAR}
                                            alt={searchUser.username}
                                        />
                                        <AvatarFallback>
                                            {searchUser.username.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 truncate">
                                        <h4 className="text-sm font-semibold tracking-tight text-foreground truncate">
                                            {displayName}
                                        </h4>
                                        <p className="text-xs text-muted-foreground truncate">
                                            @{searchUser.username}
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    size="sm"
                                    disabled={isOpening}
                                    onClick={() => handleSelectUser(searchUser._id)}
                                    className="h-8 px-3 rounded-lg gap-1.5 text-xs font-medium shrink-0"
                                >
                                    {isOpening ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Chat</span>
                                            <ArrowRight className="size-3" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && debouncedQuery.trim().length >= 2 && results.length === 0 && !error && (
                <div className="text-center py-6 text-xs text-muted-foreground italic">
                    No users found matching &ldquo;{debouncedQuery}&rdquo;.
                </div>
            )}
        </div>
    );
};

export default UserSearch;