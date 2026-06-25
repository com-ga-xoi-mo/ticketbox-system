import React, { useState, useEffect } from 'react';
import { 
  SeatingMapMetadata, SeatingZone, TicketType, ZoneMapping 
} from '../venue-map-types';
import { Button } from '../../../shared/ui/button';
import { Badge } from '../../../shared/ui/badge';
import { ArrowLeft, Upload, AlertCircle, Edit2, Trash2, Settings, Plus, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VenueMapSvgViewer } from './VenueMapSvgViewer';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../shared/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../shared/ui/dialog';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog';
import { Input } from '../../../shared/ui/input';
import { Textarea } from '../../../shared/ui/textarea';

interface VenueMapEditorProps {
  concertId: string;
  seatingMap: SeatingMapMetadata | null;
  seatingZones: SeatingZone[];
  ticketTypes: TicketType[];
  isLoading: boolean;
  isReadOnly: boolean;
  onUploadMap: (file: File) => void;
  onSaveZones: (zones: Partial<SeatingZone>[]) => void;
  onCreateTicketType: (payload: any) => void;
  onUpdateTicketType: (id: string, payload: any) => void;
  onArchiveTicketType: (id: string) => void;
  onMapZones: (ticketTypeId: string, mapping: ZoneMapping[]) => void;
  basePath: string; // back link
}

// Strip each zone down to the exact fields the backend DTO accepts
// (svgElementId, label, color?, displayOrder). The backend ValidationPipe runs
// with forbidNonWhitelisted, so leftover fields like `id`/`concertId`/`status`
// from already-saved zones would otherwise be rejected with a 400. We also
// guarantee a non-empty label (falling back to the svg element id) because the
// DTO marks label as @IsNotEmpty.
function buildZonePayload(zones: Partial<SeatingZone>[]): Partial<SeatingZone>[] {
  return zones
    .filter((z): z is Partial<SeatingZone> & { svgElementId: string } => !!z.svgElementId)
    .map((z, index) => ({
      svgElementId: z.svgElementId,
      label: z.label && z.label.trim() ? z.label.trim() : z.svgElementId,
      ...(z.color ? { color: z.color } : {}),
      displayOrder: typeof z.displayOrder === 'number' ? z.displayOrder : index,
    }));
}

export function VenueMapEditor(props: VenueMapEditorProps) {
  const navigate = useNavigate();
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Pending SVG file — not uploaded until Save is clicked
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [ticketToArchive, setTicketToArchive] = useState<TicketType | null>(null);

  // Local state for editing before saving
  const [localZones, setLocalZones] = useState<Partial<SeatingZone>[]>([]);
  
  // Modals state
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [ticketFormData, setTicketFormData] = useState({
    code: '',
    name: '',
    description: '',
    priceVnd: 0,
    totalQuantity: 0,
    saleStartsAt: '',
    saleEndsAt: '',
    maxPerUser: 1,
  });

  const [isZoneMappingModalOpen, setIsZoneMappingModalOpen] = useState(false);
  const [mappingTicketId, setMappingTicketId] = useState<string | null>(null);
  const [currentMapping, setCurrentMapping] = useState<ZoneMapping[]>([]);

  useEffect(() => {
    setLocalZones(props.seatingZones);
  }, [props.seatingZones]);

  if (props.isLoading) return <div className="p-8 text-white">Loading editor...</div>;

  const svgElementIds = props.seatingMap?.svgElementIds || [];

  const handleOpenTicketModal = (ticket?: TicketType) => {
    if (ticket) {
      setEditingTicketId(ticket.id);
      setTicketFormData({
        code: ticket.code,
        name: ticket.name,
        description: ticket.description || '',
        priceVnd: ticket.priceVnd,
        totalQuantity: ticket.totalQuantity,
        saleStartsAt: ticket.saleStartsAt ? new Date(ticket.saleStartsAt).toISOString().slice(0, 16) : '',
        saleEndsAt: ticket.saleEndsAt ? new Date(ticket.saleEndsAt).toISOString().slice(0, 16) : '',
        maxPerUser: ticket.maxPerUser,
      });
    } else {
      setEditingTicketId(null);
      setTicketFormData({
        code: '',
        name: '',
        description: '',
        priceVnd: 0,
        totalQuantity: 0,
        saleStartsAt: '',
        saleEndsAt: '',
        maxPerUser: 1,
      });
    }
    setIsTicketModalOpen(true);
  };

  const handleSaveTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...ticketFormData,
      saleStartsAt: ticketFormData.saleStartsAt ? new Date(ticketFormData.saleStartsAt).toISOString() : new Date().toISOString(),
      saleEndsAt: ticketFormData.saleEndsAt ? new Date(ticketFormData.saleEndsAt).toISOString() : new Date().toISOString(),
    };
    
    if (editingTicketId) {
      props.onUpdateTicketType(editingTicketId, payload);
    } else {
      props.onCreateTicketType(payload);
    }
    setIsTicketModalOpen(false);
  };

  const handleOpenMappingModal = (ticket: TicketType) => {
    setMappingTicketId(ticket.id);
    setCurrentMapping(ticket.mappedZones);
    setIsZoneMappingModalOpen(true);
  };

  const handleSaveMapping = () => {
    if (mappingTicketId) {
      props.onMapZones(mappingTicketId, currentMapping);
    }
    setIsZoneMappingModalOpen(false);
  };

  const handleSave = () => {
    if (pendingFile) {
      props.onUploadMap(pendingFile);
      setPendingFile(null);
    } else {
      props.onSaveZones(buildZonePayload(localZones));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0F19] text-white overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(props.basePath)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Midnight Echo Live</h1>
          <Badge variant="muted" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">DRAFT</Badge>
          {props.isReadOnly && <Badge variant="muted" className="bg-amber-500/10 text-amber-400">Read Only</Badge>}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-slate-400">
            <span className="material-symbols-outlined">notifications</span>
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400">
            <span className="material-symbols-outlined">help</span>
          </Button>
        </div>
      </header>

      {props.isReadOnly && (
        <div className="bg-amber-900/30 border-b border-amber-900/50 p-3 text-amber-200 text-sm flex items-center justify-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4" />
          This concert is no longer in DRAFT status. Mapping changes are disabled to prevent data corruption.
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Top Area: SVG Map & Zones List */}
        <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
          
          {/* Left Side: SVG Viewer */}
          <div className="flex-1 flex flex-col border border-slate-800 rounded-xl bg-slate-900/50 relative overflow-hidden">
            {!props.seatingMap?.assetId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Upload Venue Map</h2>
                <p className="text-slate-400 mb-6 max-w-md text-center">
                  Upload an SVG file to start mapping seating zones. Elements with IDs will become selectable zones.
                </p>
                <input
                  type="file"
                  accept=".svg"
                  className="hidden"
                  id="svg-upload"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setPendingFile(e.target.files[0]);
                  }}
                  disabled={props.isReadOnly}
                />
                <Button
                  disabled={props.isReadOnly}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('svg-upload')?.click();
                  }}
                >
                  <span>Select SVG File</span>
                </Button>
                {pendingFile && (
                  <div className="mt-4 text-indigo-300 text-sm flex items-center gap-2 bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="truncate">{pendingFile.name} — click <strong>Save</strong> to upload</span>
                  </div>
                )}
                {props.seatingZones.length > 0 && (
                  <div className="mt-4 text-amber-400 text-sm flex items-center gap-2 bg-amber-400/10 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    Uploading a new map will invalidate existing zones and mappings
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 relative flex items-center justify-center p-4">
                 <div className="w-full h-full max-w-3xl flex items-center justify-center relative overflow-hidden">
                   <span className="text-slate-500 absolute top-4 left-4 z-10 font-mono text-sm">SVG Preview ({props.seatingMap.assetId})</span>
                   <VenueMapSvgViewer
                     seatingMap={props.seatingMap}
                     seatingZones={localZones}
                     selectedElementId={selectedElementId}
                     hoveredElementId={hoveredElementId}
                     onElementClick={setSelectedElementId}
                     onElementHover={setHoveredElementId}
                   />
                 </div>
                 
                 <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
                   <input
                    type="file"
                    accept=".svg"
                    className="hidden"
                    id="svg-reupload"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setPendingFile(e.target.files[0]);
                    }}
                    disabled={props.isReadOnly}
                   />
                   <Button
                     variant="outline"
                     size="sm"
                     disabled={props.isReadOnly}
                     onClick={(e) => {
                       e.preventDefault();
                       document.getElementById('svg-reupload')?.click();
                     }}
                     className="bg-slate-900 border-slate-700"
                   >
                     <Upload className="w-4 h-4 mr-2" /> Re-upload Map
                   </Button>
                   {pendingFile && (
                     <div className="text-indigo-300 text-xs flex items-center gap-1.5 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 max-w-[200px]">
                       <Upload className="w-3 h-3 shrink-0" />
                       <span className="truncate">{pendingFile.name}</span>
                     </div>
                   )}
                 </div>
              </div>
            )}
          </div>

          {/* Right Side: Detected Map Zones list */}
          <div className="w-full lg:w-[450px] flex flex-col border border-slate-800 rounded-xl bg-slate-900/50 shrink-0 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
               <h2 className="font-semibold text-slate-200">Detected Map Zones</h2>
               <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700 bg-slate-950 px-2 py-0.5">{svgElementIds.length} PATHS LINKED</Badge>
            </div>

            <div className="p-4 space-y-3">
               {svgElementIds.length === 0 && (
                 <div className="text-center p-6 text-sm text-slate-400 bg-slate-950/50 rounded-lg border border-slate-800">
                   No map elements found.
                 </div>
               )}

               {svgElementIds.map(svgId => {
                 const zone = localZones.find(z => z.svgElementId === svgId);
                 const isSelected = selectedElementId === svgId;
                 const isHovered = hoveredElementId === svgId;
                 
                 return (
                   <div 
                     key={svgId}
                     className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                       isSelected ? 'border-indigo-500 bg-indigo-500/10' : 
                       isHovered ? 'border-slate-500 bg-slate-800' : 
                       'border-slate-800 bg-slate-950/50'
                     }`}
                     onMouseEnter={() => setHoveredElementId(svgId)}
                     onMouseLeave={() => setHoveredElementId(null)}
                     onClick={() => setSelectedElementId(svgId)}
                   >
                     <div className="flex justify-between items-center mb-2">
                       <code className="text-xs text-slate-400 font-mono">#{svgId}</code>
                       <div className="flex gap-1">
                         {/* Options Menu (simplified as an action icon for future ext) */}
                         <Button variant="ghost" size="icon" className="h-6 w-6" disabled={props.isReadOnly}>
                            <Settings className="w-3 h-3 text-slate-400" />
                         </Button>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-3">
                       {/* Color Picker */}
                       <div className="flex-shrink-0 flex items-center justify-center relative rounded overflow-hidden w-8 h-8 border border-slate-700">
                          <input
                            type="color"
                            className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer bg-transparent border-0"
                            value={zone?.color || '#3b82f6'}
                            onChange={(e) => {
                              const newZones = [...localZones];
                              const idx = newZones.findIndex(z => z.svgElementId === svgId);
                              if (idx >= 0) newZones[idx] = { ...newZones[idx], color: e.target.value };
                              else newZones.push({ svgElementId: svgId, label: '', color: e.target.value, displayOrder: newZones.length });
                              setLocalZones(newZones);
                            }}
                            disabled={props.isReadOnly}
                            onClick={e => e.stopPropagation()}
                          />
                       </div>

                       <div className="flex-1 space-y-1">
                          <input 
                            type="text" 
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                            value={zone?.label || ''}
                            onChange={(e) => {
                              const newZones = [...localZones];
                              const idx = newZones.findIndex(z => z.svgElementId === svgId);
                              if (idx >= 0) newZones[idx] = { ...newZones[idx], label: e.target.value };
                              else newZones.push({ svgElementId: svgId, label: e.target.value, displayOrder: newZones.length });
                              setLocalZones(newZones);
                            }}
                            disabled={props.isReadOnly}
                            placeholder="Zone Label"
                            onClick={e => e.stopPropagation()}
                          />
                       </div>

                       <div className="w-16 space-y-1">
                          <input 
                            type="number" 
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200"
                            value={zone?.displayOrder ?? ''}
                            onChange={(e) => {
                              const newZones = [...localZones];
                              const idx = newZones.findIndex(z => z.svgElementId === svgId);
                              const order = parseInt(e.target.value, 10) || 0;
                              if (idx >= 0) newZones[idx] = { ...newZones[idx], displayOrder: order };
                              else newZones.push({ svgElementId: svgId, label: '', displayOrder: order });
                              setLocalZones(newZones);
                            }}
                            disabled={props.isReadOnly}
                            placeholder="Ord"
                            onClick={e => e.stopPropagation()}
                          />
                       </div>
                     </div>
                   </div>
                 )
               })}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0 flex flex-col gap-2">
              {!props.isReadOnly && (
                <Button className="btn-primary w-full" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  {pendingFile ? 'Upload & Save' : 'Save Configuration'}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full border-slate-700 bg-transparent hover:bg-slate-800"
                onClick={() => { setLocalZones(props.seatingZones); setPendingFile(null); }}
                disabled={props.isReadOnly}
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
        
        {/* Bottom Area: Ticket Type Assignment */}
        <div className="border border-slate-800 rounded-xl bg-slate-900/50 flex flex-col">
           <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="font-semibold text-lg text-slate-200">Ticket Type Assignment</h2>
              {!props.isReadOnly && (
                 <Button onClick={() => handleOpenTicketModal()}>
                   <Plus className="w-4 h-4 mr-2" /> Add Ticket Type
                 </Button>
              )}
           </div>
           
           <div className="p-4 overflow-x-auto">
             <Table>
               <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                     <TableHead className="text-slate-400 text-xs">CODE</TableHead>
                     <TableHead className="text-slate-400 text-xs">TICKET NAME</TableHead>
                     <TableHead className="text-slate-400 text-xs">PRICE (VND)</TableHead>
                     <TableHead className="text-slate-400 text-xs">QTY</TableHead>
                     <TableHead className="text-slate-400 text-xs">SALE WINDOW</TableHead>
                     <TableHead className="text-slate-400 text-xs">LIMITS</TableHead>
                     <TableHead className="text-slate-400 text-xs">MAPPED ZONES</TableHead>
                     <TableHead className="text-slate-400 text-xs text-right">ACTIONS</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {props.ticketTypes.length === 0 ? (
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                        No ticket types configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    props.ticketTypes.map(tt => (
                      <TableRow key={tt.id} className="border-slate-800 hover:bg-slate-800/50">
                         <TableCell className="font-mono text-xs">{tt.code}</TableCell>
                         <TableCell className="font-medium text-slate-200">{tt.name}</TableCell>
                         <TableCell className="text-emerald-400 font-medium">{tt.priceVnd.toLocaleString('vi-VN')}</TableCell>
                         <TableCell>{tt.totalQuantity}</TableCell>
                         <TableCell className="text-xs text-slate-400">
                            {new Date(tt.saleStartsAt).toLocaleDateString()} - {new Date(tt.saleEndsAt).toLocaleDateString()}
                         </TableCell>
                         <TableCell>Max {tt.maxPerUser}</TableCell>
                         <TableCell>
                            <div className="flex flex-wrap gap-1">
                               {tt.mappedZones.length > 0 ? (
                                 tt.mappedZones.map(m => {
                                   const z = props.seatingZones.find(sz => sz.id === m.seatingZoneId);
                                   return (
                                     <Badge key={m.seatingZoneId} variant="outline" className="text-[10px] bg-slate-950 border-slate-700">
                                       {z?.label || z?.svgElementId || m.seatingZoneId}
                                     </Badge>
                                   )
                                 })
                               ) : (
                                 <span className="text-slate-500 text-xs italic">Unmapped</span>
                               )}
                            </div>
                         </TableCell>
                         <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-2">
                               <Button 
                                 size="sm" 
                                 variant="outline" 
                                 className="text-xs h-7 px-2 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
                                 onClick={() => handleOpenMappingModal(tt)}
                                 disabled={props.isReadOnly}
                               >
                                 ASSIGN ZONES
                               </Button>
                               {!props.isReadOnly && (
                                 <>
                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200" onClick={() => handleOpenTicketModal(tt)}>
                                     <Edit2 className="w-3.5 h-3.5"/>
                                   </Button>
                                   <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => setTicketToArchive(tt)}>
                                     <Trash2 className="w-3.5 h-3.5"/>
                                   </Button>
                                 </>
                               )}
                            </div>
                         </TableCell>
                      </TableRow>
                    ))
                  )}
               </TableBody>
             </Table>
           </div>
        </div>
      </div>

      {/* Ticket Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0F172A] border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle>{editingTicketId ? 'Edit Ticket Type' : 'Create Ticket Type'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTicket} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Code *</label>
                <Input 
                  value={ticketFormData.code} 
                  onChange={e => setTicketFormData(p => ({...p, code: e.target.value}))} 
                  className="bg-slate-900 border-slate-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Name *</label>
                <Input 
                  value={ticketFormData.name} 
                  onChange={e => setTicketFormData(p => ({...p, name: e.target.value}))} 
                  className="bg-slate-900 border-slate-800"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Description</label>
              <Textarea 
                value={ticketFormData.description} 
                onChange={e => setTicketFormData(p => ({...p, description: e.target.value}))} 
                className="bg-slate-900 border-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Price (VND) *</label>
                <Input 
                  type="number"
                  value={ticketFormData.priceVnd} 
                  onChange={e => setTicketFormData(p => ({...p, priceVnd: Number(e.target.value)}))} 
                  className="bg-slate-900 border-slate-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Total Qty *</label>
                <Input 
                  type="number"
                  value={ticketFormData.totalQuantity} 
                  onChange={e => setTicketFormData(p => ({...p, totalQuantity: Number(e.target.value)}))} 
                  className="bg-slate-900 border-slate-800"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Sale Starts At *</label>
                <Input 
                  type="datetime-local"
                  value={ticketFormData.saleStartsAt} 
                  onChange={e => setTicketFormData(p => ({...p, saleStartsAt: e.target.value}))} 
                  className="bg-slate-900 border-slate-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Sale Ends At *</label>
                <Input 
                  type="datetime-local"
                  value={ticketFormData.saleEndsAt} 
                  onChange={e => setTicketFormData(p => ({...p, saleEndsAt: e.target.value}))} 
                  className="bg-slate-900 border-slate-800"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Max Per User *</label>
              <Input 
                type="number"
                value={ticketFormData.maxPerUser} 
                onChange={e => setTicketFormData(p => ({...p, maxPerUser: Number(e.target.value)}))} 
                className="bg-slate-900 border-slate-800"
                required
                min={1}
              />
            </div>
            <DialogFooter className="mt-6 border-slate-800 bg-transparent sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsTicketModalOpen(false)} className="border-slate-700">Cancel</Button>
              <Button type="submit">{editingTicketId ? 'Save Changes' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Zone Mapping Modal */}
      <Dialog open={isZoneMappingModalOpen} onOpenChange={setIsZoneMappingModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0F172A] border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle>Assign Zones</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-400">Select which zones this ticket grants access to.</p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {props.seatingZones.length === 0 ? (
                <div className="text-sm text-slate-500 italic">No seating zones available.</div>
              ) : (
                props.seatingZones.map(zone => {
                  const isMapped = currentMapping.some(m => m.seatingZoneId === zone.id);
                  return (
                    <label key={zone.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-800 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        checked={isMapped}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCurrentMapping([...currentMapping, { seatingZoneId: zone.id, svgElementId: zone.svgElementId, label: zone.label }]);
                          } else {
                            setCurrentMapping(currentMapping.filter(m => m.seatingZoneId !== zone.id));
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-950 text-indigo-500 w-4 h-4"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color || '#3b82f6' }} />
                        <span className="text-sm text-slate-300 font-medium">{zone.label || zone.svgElementId}</span>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
            <DialogFooter className="mt-6 border-slate-800 bg-transparent sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setIsZoneMappingModalOpen(false)} className="border-slate-700">Cancel</Button>
              <Button onClick={handleSaveMapping}>Save Mapping</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!ticketToArchive}
        onOpenChange={(open) => !open && setTicketToArchive(null)}
        title="Xác nhận lưu trữ loại vé"
        description={`Bạn có chắc chắn muốn lưu trữ loại vé "${ticketToArchive?.name}" không? Thao tác này sẽ ẩn loại vé, những vé đã bán vẫn được giữ nguyên.`}
        confirmText="Lưu trữ"
        cancelText="Quay lại"
        confirmVariant="destructive"
        onConfirm={() => {
          if (ticketToArchive) props.onArchiveTicketType(ticketToArchive.id);
        }}
      />
    </div>
  );
}
