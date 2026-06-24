import { useParams } from 'react-router-dom';
import { useVenueMapEditor, useUploadSeatingMapMutation, useSaveSeatingZonesMutation, useCreateTicketTypeMutation, useUpdateTicketTypeMutation, useArchiveTicketTypeMutation, useMapZonesToTicketTypeMutation } from './hooks';
import { useConcerts, useConcert } from '../concerts/hooks';
import { VenueMapList } from '../../concerts-shared/components/VenueMapList';
import { VenueMapEditor } from '../../concerts-shared/components/VenueMapEditor';

export function OrganizerVenueMapsList() {
  const { data: concerts = [], isLoading } = useConcerts();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Venue Maps</h1>
        <p className="text-slate-400">Select a concert to configure its venue map, seating zones, and ticket types.</p>
      </div>
      <VenueMapList 
        concerts={concerts} 
        basePath="/organizer/venue-maps" 
        isLoading={isLoading} 
      />
    </div>
  );
}

export function OrganizerVenueMapEditor() {
  const { id } = useParams<{ id: string }>();
  const { data: concert, isLoading: isConcertLoading } = useConcert(id!);
  const { data, isLoading: isEditorLoading } = useVenueMapEditor(id!);

  const uploadMutation = useUploadSeatingMapMutation();
  const saveZonesMutation = useSaveSeatingZonesMutation();
  const createTicketMutation = useCreateTicketTypeMutation();
  const updateTicketMutation = useUpdateTicketTypeMutation();
  const archiveTicketMutation = useArchiveTicketTypeMutation();
  const mapZonesMutation = useMapZonesToTicketTypeMutation();

  const isLoading = isConcertLoading || isEditorLoading;

  if (isLoading) return <div className="p-8 text-slate-400">Loading...</div>;
  if (!concert) return <div className="p-8 text-slate-400">Concert not found</div>;

  return (
    <VenueMapEditor
      concertId={id!}
      seatingMap={data?.seatingMap || null}
      seatingZones={data?.seatingZones || []}
      ticketTypes={data?.ticketTypes || []}
      isLoading={isLoading}
      isReadOnly={concert.status !== 'DRAFT'}
      basePath="/organizer/venue-maps"
      onUploadMap={(file) => uploadMutation.mutate({ concertId: id!, file })}
      onSaveZones={(payload) => saveZonesMutation.mutate({ concertId: id!, payload: { zones: payload } })}
      onCreateTicketType={(payload) => createTicketMutation.mutate({ concertId: id!, payload })}
      onUpdateTicketType={(ticketTypeId, payload) => updateTicketMutation.mutate({ concertId: id!, ticketTypeId, payload })}
      onArchiveTicketType={(ticketTypeId) => archiveTicketMutation.mutate({ concertId: id!, ticketTypeId })}
      onMapZones={(ticketTypeId, mapping) => mapZonesMutation.mutate({ concertId: id!, ticketTypeId, payload: { seatingZoneIds: mapping.map(m => m.seatingZoneId) } })}
    />
  );
}
