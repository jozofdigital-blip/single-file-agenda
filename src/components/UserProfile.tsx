import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getSupabase } from "@/lib/supabaseSafe";

interface UserProfileProps {
  userId: string;
}

export const UserProfile = ({ userId }: UserProfileProps) => {
  const [profile, setProfile] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = await getSupabase();
        const { data } = await supabase
          .from('profiles')
          .select('first_name, last_name, username, photo_url')
          .eq('id', userId)
          .single();
        
        if (data) {
          setProfile(data);
        }
      } catch (error) {
        console.error('[UserProfile] Failed to load profile:', error);
      }
    };

    loadProfile();
  }, [userId]);

  const displayName = profile?.first_name || profile?.username || 'Пользователь';
  const initials = profile?.first_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'П';

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10">
        {profile?.photo_url && <AvatarImage src={profile.photo_url} alt={displayName} />}
        <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{displayName}</span>
        {profile?.username && (
          <span className="text-xs text-muted-foreground">@{profile.username}</span>
        )}
      </div>
    </div>
  );
};
