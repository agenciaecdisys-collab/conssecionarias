import { useAuth } from "./useAuth";

export function useDealership() {
    const { dealership, profile } = useAuth();
    return {
        dealership,
        dealershipId: profile?.dealership_id ?? null,
    };
}
