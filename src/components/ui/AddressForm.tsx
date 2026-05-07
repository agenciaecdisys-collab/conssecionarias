import { ExternalLink, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface AddressData {
  address: string;
  number: string;
  latitude: number | null;
  longitude: number | null;
}

interface AddressFormProps {
  value: AddressData;
  onChange: (data: AddressData) => void;
}

const GOOGLE_MAPS_URL = "https://www.google.com/maps";

const AddressForm = ({ value, onChange }: AddressFormProps) => {
  const set = (field: keyof AddressData, val: string | number | null) => {
    onChange({ ...value, [field]: val });
  };

  const latStr = value.latitude != null ? String(value.latitude) : "";
  const lngStr = value.longitude != null ? String(value.longitude) : "";

  const parseCoord = (s: string): number | null => {
    const n = parseFloat(s.replace(",", "."));
    return isNaN(n) ? null : n;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Endereço completo</label>
        <Textarea
          value={value.address || ""}
          onChange={(e) => set("address", e.target.value)}
          className="bg-secondary/50 border-border"
          placeholder="Rua, bairro, cidade - UF"
          rows={2}
        />
      </div>

      <div className="w-32">
        <label className="text-xs text-muted-foreground mb-1 block">Número</label>
        <Input
          value={value.number || ""}
          onChange={(e) => set("number", e.target.value)}
          className="bg-secondary/50 border-border"
          placeholder="Nº"
        />
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Info className="w-4 h-4 text-primary" />
          Como obter latitude e longitude
        </div>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Abra o Google Maps no navegador</li>
          <li>Busque o endereço da loja</li>
          <li>Clique com o botão direito no ponto exato da fachada</li>
          <li>Clique em &quot;O que há aqui?&quot;</li>
          <li>As coordenadas aparecem na parte inferior (ex: -23.550520, -46.633308)</li>
        </ol>
        <a
          href={GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Abrir Google Maps
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
          <Input
            value={latStr}
            onChange={(e) => set("latitude", parseCoord(e.target.value))}
            className="bg-secondary/50 border-border font-mono text-sm"
            placeholder="-23.550520"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
          <Input
            value={lngStr}
            onChange={(e) => set("longitude", parseCoord(e.target.value))}
            className="bg-secondary/50 border-border font-mono text-sm"
            placeholder="-46.633308"
          />
        </div>
      </div>
    </div>
  );
};

export default AddressForm;
