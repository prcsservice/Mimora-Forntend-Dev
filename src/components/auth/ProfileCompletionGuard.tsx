import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProfileCompletionGuardProps {
    children: React.ReactNode;
}

/**
 * Route guard that redirects artists with incomplete profiles
 * to the signup page to complete their profile.
 * 
 * Usage: Wrap protected artist routes with this guard.
 * <ProfileCompletionGuard><ArtistHomePage /></ProfileCompletionGuard>
 */
export default function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
    const { user } = useAuth();

    // Not logged in — redirect to auth
    if (!user) {
        return <Navigate to="/auth/artist/login" replace />;
    }

    // Check if artist has completed profile
    const userData = typeof user === 'string' ? JSON.parse(user) : user;

    if (userData.profile_completed === false) {
        // Redirect to artist signup to complete profile
        return <Navigate to="/auth/artist/signup" replace />;
    }

    return <>{children}</>;
}
