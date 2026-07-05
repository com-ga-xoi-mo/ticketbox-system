import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { FieldGroup, Field, FieldLabel, FieldDescription } from '../../../components/ui/field';
import { InputGroup, InputGroupInput, InputGroupAddon } from '../../../components/ui/input-group';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { useCreateResaleListing } from '../../../shared/api/resale';

interface ResaleListingFormProps {
  ticketId: string;
  originalPriceVnd: number;
  maxPricePercent: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ResaleListingForm({ ticketId, originalPriceVnd, maxPricePercent, onSuccess, onCancel }: ResaleListingFormProps) {
  const [askingPrice, setAskingPrice] = useState<string>(originalPriceVnd.toString());
  const maxPrice = Math.floor(originalPriceVnd * (maxPricePercent / 100));
  
  const createListing = useCreateResaleListing();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseInt(askingPrice, 10);
    if (isNaN(price) || price <= 0) return;
    createListing.mutate({ ticketId, askingPriceVnd: price }, {
      onSuccess
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-muted/30 p-4 mt-4">
      <h3 className="font-semibold text-lg mb-4">Bán lại vé</h3>
      
      <FieldGroup>
        <Field>
          <FieldLabel>Giá gốc</FieldLabel>
          <div className="font-medium text-foreground">{originalPriceVnd.toLocaleString('vi-VN')} đ</div>
        </Field>
        
        <Field>
          <FieldLabel htmlFor="asking-price">Giá bán (Tối đa {maxPricePercent}%)</FieldLabel>
          <InputGroup>
            <InputGroupInput 
              id="asking-price"
              type="number" 
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              min={1}
              max={maxPrice}
              required
            />
            <InputGroupAddon>đ</InputGroupAddon>
          </InputGroup>
          <FieldDescription>Tối đa: {maxPrice.toLocaleString('vi-VN')} đ</FieldDescription>
        </Field>
      </FieldGroup>

      {createListing.isError && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>Không thể tạo listing. Kiểm tra lại điều kiện.</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button type="button" variant="ghost" onClick={onCancel}>Hủy</Button>
        <Button type="submit" disabled={createListing.isPending}>
          {createListing.isPending ? 'Đang xử lý...' : 'Xác nhận bán'}
        </Button>
      </div>
    </form>
  );
}

