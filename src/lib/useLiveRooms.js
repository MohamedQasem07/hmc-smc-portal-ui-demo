import { useCallback, useEffect, useState } from 'react'
import { IS_SUPABASE } from './api/config'
import { fetchRoomsForLocation } from './api/portalData'

/* =========================================================================
 * useLiveRooms — supabase-mode live room catalogue for a branch (Phase 2).
 * -----------------------------------------------------------------------
 * Returns the active rooms for a branch location CODE (e.g. 'al_kawther').
 * Inert (empty) in mock mode or when no code is supplied (external clinics
 * have no room board). Occupancy is derived by the caller from the live
 * cases list (case.centerRoomId) so the board reflects portal_room_assignments
 * via portal_cases.center_room_id with NO extra round-trips per room.
 * ========================================================================= */
export function useLiveRooms(locationCode) {
  const [rooms, setRooms] = useState([])
  const reloadRooms = useCallback(async () => {
    if (!IS_SUPABASE || !locationCode) { setRooms([]); return }
    try { setRooms(await fetchRoomsForLocation(locationCode)) }
    catch { setRooms([]) }
  }, [locationCode])
  useEffect(() => { reloadRooms() }, [reloadRooms])
  return { rooms, reloadRooms }
}
