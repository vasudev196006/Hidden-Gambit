import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useJoinGame } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";

export default function Join() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("playerName") || "");
  const joinGame = useJoinGame();

  const handleJoin = () => {
    if (!playerName.trim()) {
      toast({ title: "Player name required", variant: "destructive" });
      return;
    }
    if (!id) return;
    localStorage.setItem("playerName", playerName);
    joinGame.mutate(
      { id, data: { playerName } },
      {
        onSuccess: (res) => {
          sessionStorage.setItem(`game_${res.gameId}_player`, res.playerId);
          sessionStorage.setItem(`game_${res.gameId}_color`, res.color);
          setLocation(`/game/${res.gameId}`);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || "Failed to join game";
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center flex flex-col items-center">
          <img 
            src="/logo_transparent.png" 
            alt="Hidden Gambit Logo" 
            className="h-36 w-auto object-contain mb-3 hover:scale-105 transition-transform duration-300"
          />
          <p className="text-muted-foreground">You've been invited to a chess match.</p>
        </div>

        <Card className="bg-card border-card-border">
          <CardHeader>
            <CardTitle className="font-mono">Join Match</CardTitle>
            <CardDescription>
              Code: <span className="font-mono text-primary">{id}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Player Name</label>
              <Input
                placeholder="Enter your name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                className="bg-background font-mono"
                autoFocus
              />
            </div>
            <Button
              onClick={handleJoin}
              disabled={joinGame.isPending}
              className="w-full font-mono uppercase tracking-widest"
            >
              {joinGame.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Join Game
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
