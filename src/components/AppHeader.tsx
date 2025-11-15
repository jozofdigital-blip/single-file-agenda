import { List, Archive } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { UserProfile } from "./UserProfile";
import { NotificationSettings } from "./NotificationSettings";

interface AppHeaderProps {
  userId: string;
}

export const AppHeader = ({ userId }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm bg-card/95">
      <div className="container max-w-2xl mx-auto px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <UserProfile userId={userId} />
          <div className="flex gap-1">
            <NotificationSettings userId={userId} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/all-tasks")}
              className="shrink-0"
              title="Все задачи"
            >
              <List className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/archive")}
              className="shrink-0"
              title="Архив"
            >
              <Archive className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};