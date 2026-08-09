import { useState } from "react";
import { useLocation } from "wouter";
import { useListGames, useCreateGame, useJoinGame } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, LogIn, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("playerName") || "");
  const { data: games, isLoading: isLoadingGames } = useListGames();

  const createGame = useCreateGame();
  const joinGame = useJoinGame();

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      toast({ title: "Player name required", variant: "destructive" });
      return;
    }
    localStorage.setItem("playerName", playerName);
    createGame.mutate(
      { data: { playerName } },
      {
        onSuccess: (res) => {
          sessionStorage.setItem(`game_${res.gameId}_player`, res.playerId);
          sessionStorage.setItem(`game_${res.gameId}_color`, res.color);
          setLocation(`/game/${res.gameId}`);
        },
        onError: () => {
          toast({ title: "Failed to create game", variant: "destructive" });
        },
      }
    );
  };

  const handleJoinGame = (gameId: string) => {
    if (!playerName.trim()) {
      toast({ title: "Player name required", variant: "destructive" });
      return;
    }
    localStorage.setItem("playerName", playerName);
    joinGame.mutate(
      { id: gameId, data: { playerName } },
      {
        onSuccess: (res) => {
          sessionStorage.setItem(`game_${res.gameId}_player`, res.playerId);
          sessionStorage.setItem(`game_${res.gameId}_color`, res.color);
          setLocation(`/game/${res.gameId}`);
        },
        onError: () => {
          toast({ title: "Failed to join game", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div className="flex flex-col justify-center space-y-6">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <img 
              src="/chess_logo.png" 
              alt="Hidden Gambit Logo" 
              className="h-44 md:h-52 w-auto object-contain mb-3 drop-shadow-[0_10px_30px_rgba(220,38,38,0.45)] hover:scale-105 transition-transform duration-300"
            />
            <p className="text-muted-foreground text-base max-w-sm">A tactical duel of hidden information. Trust no pawn.</p>
          </div>

          <Card className="bg-card border-card-border">
            <CardHeader>
              <CardTitle className="font-mono">Briefing</CardTitle>
              <CardDescription>Identify yourself to enter the operative network.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Operative Name</label>
                <Input 
                  placeholder="Enter your name..." 
                  value={playerName} 
                  onChange={(e) => setPlayerName(e.target.value)} 
                  className="bg-background font-mono"
                />
              </div>
              <Button 
                onClick={handleCreateGame} 
                disabled={createGame.isPending}
                className="w-full font-mono uppercase tracking-widest"
              >
                {createGame.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Initiate New Operation
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col space-y-4">
          <h2 className="text-2xl font-mono font-semibold flex items-center"><Users className="mr-2 h-5 w-5" /> Open Operations</h2>
          
          <div className="flex-1 overflow-y-auto space-y-3 min-h-[400px]">
            {isLoadingGames ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : games?.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed border-border rounded-lg p-8">
                <p>No active operations found. Initiate one.</p>
              </div>
            ) : (
              games?.map((game) => (
                <Card key={game.id} className="bg-card/50 hover:bg-card border-card-border transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{game.whitePlayerName} <span className="text-muted-foreground">vs</span> {game.blackPlayerName || "???"}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">Status: {game.status.toUpperCase()} • {formatDistanceToNow(new Date(game.createdAt))} ago</p>
                    </div>
                    {game.status === 'waiting' ? (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleJoinGame(game.id)}
                        disabled={joinGame.isPending}
                      >
                        <LogIn className="mr-2 h-4 w-4" /> Join
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setLocation(`/game/${game.id}`)}>
                        Spectate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
