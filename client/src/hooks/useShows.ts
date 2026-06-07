import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * Show/exhibition CRUD for a Pro user. Mirrors useEvents — wraps the tRPC
 * mutations with toasts and cache invalidation. The `shows.list` query is
 * Pro-gated on the server; non-Pro callers simply get an empty list via the
 * `enabled` guard so the UI degrades cleanly.
 */
export function useShows(enabled = true) {
    const utils = trpc.useUtils();

    const { data: shows = [], isLoading } = trpc.shows.list.useQuery(undefined, { enabled });

    const invalidate = () => {
        utils.shows.list.invalidate();
    };

    const createShow = trpc.shows.create.useMutation({
        onSuccess: () => { invalidate(); toast.success("Show added!"); },
        onError: (e) => toast.error(e.message),
    });

    const updateShow = trpc.shows.update.useMutation({
        onSuccess: () => { invalidate(); toast.success("Show updated!"); },
        onError: (e) => toast.error(e.message),
    });

    const deleteShow = trpc.shows.delete.useMutation({
        onSuccess: () => { invalidate(); toast.success("Show removed."); },
        onError: (e) => toast.error(e.message),
    });

    return { shows, isLoading, createShow, updateShow, deleteShow, utils };
}
