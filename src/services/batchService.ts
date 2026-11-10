import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Batch, Checkpoint } from '../types';

// Convert DB Record sang Batch Interface
export const mapDbToBatch = (row: any, checkpointsRows: any[] = []): Batch => {
  const checkpoints: Checkpoint[] = checkpointsRows.map((cp) => ({
    stepName: cp.step_name || '',
    role: cp.role || '',
    roleTitle: cp.role_title || '',
    location: cp.location || '',
    action: cp.action || '',
    timestamp: Number(cp.timestamp || Date.now()),
    recorder: cp.recorder || '',
    metadataURI: cp.metadata_uri || '',
    txHash: cp.tx_hash || '',
    conditionNote: cp.condition_note || ''
  }));

  return {
    batchCode: row.batch_code,
    productName: row.product_name,
    origin: row.origin,
    createdAt: new Date(row.created_at || Date.now()).getTime(),
    producer: row.producer,
    isVerified: Boolean(row.is_verified),
    exists: row.exists !== false,
    isListed: Boolean(row.is_listed),
    category: row.category || undefined,
    listingPriceEth: row.listing_price_eth || undefined,
    storeName: row.store_name || undefined,
    starRating: row.star_rating || undefined,
    ocopStandard: row.ocop_standard || undefined,
    certificationNo: row.certification_no || undefined,
    quantity: row.quantity || undefined,
    currentStage: row.current_stage || undefined,
    inspectorNote: row.inspector_note || undefined,
    certificateURI: row.certificate_uri || undefined,
    imageUrl: row.image_url || undefined,
    productionDate: row.production_date || undefined,
    expiryDate: row.expiry_date || undefined,
    txHash: row.tx_hash || undefined,
    verifyTxHash: row.verify_tx_hash || undefined,
    inspectionFeePaid: row.inspection_fee_paid || undefined,
    checkpoints
  };
};

// Map Batch Object thanh Record DB
export const mapBatchToDb = (batch: Batch) => {
  return {
    batch_code: batch.batchCode,
    product_name: batch.productName,
    origin: batch.origin,
    producer: batch.producer,
    is_verified: batch.isVerified,
    exists: batch.exists !== false,
    is_listed: batch.isListed || false,
    category: batch.category || null,
    listing_price_eth: batch.listingPriceEth || null,
    store_name: batch.storeName || null,
    star_rating: batch.starRating || null,
    ocop_standard: batch.ocopStandard || null,
    certification_no: batch.certificationNo || null,
    quantity: batch.quantity || null,
    current_stage: batch.currentStage || null,
    inspector_note: batch.inspectorNote || null,
    certificate_uri: batch.certificateURI || null,
    image_url: batch.imageUrl || null,
    production_date: batch.productionDate || null,
    expiry_date: batch.expiryDate || null,
    tx_hash: batch.txHash || null,
    verify_tx_hash: batch.verifyTxHash || null,
    inspection_fee_paid: batch.inspectionFeePaid || null,
    updated_at: new Date().toISOString()
  };
};

// Doc tat ca lo hang tu Supabase
export const fetchBatchesFromSupabase = async (): Promise<Record<string, Batch> | null> => {
  if (!isSupabaseConfigured) return null;

  try {
    const { data: batchRows, error: batchErr } = await supabase
      .from('batches')
      .select('*')
      .order('created_at', { ascending: false });

    if (batchErr) {
      console.error('Loi doc danh sach lo hang tu Supabase:', batchErr);
      return null;
    }

    if (!batchRows || batchRows.length === 0) {
      return {};
    }

    const { data: historyRows, error: historyErr } = await supabase
      .from('batch_history')
      .select('*')
      .order('timestamp', { ascending: true });

    if (historyErr) {
      console.warn('Loi doc lich su checkpoint tu Supabase:', historyErr);
    }

    const checkpointsByBatch: Record<string, any[]> = {};
    (historyRows || []).forEach((cp) => {
      if (!checkpointsByBatch[cp.batch_code]) {
        checkpointsByBatch[cp.batch_code] = [];
      }
      checkpointsByBatch[cp.batch_code].push(cp);
    });

    const result: Record<string, Batch> = {};
    batchRows.forEach((row) => {
      const cps = checkpointsByBatch[row.batch_code] || [];
      result[row.batch_code] = mapDbToBatch(row, cps);
    });

    return result;
  } catch (err) {
    console.error('Loi fetchBatchesFromSupabase:', err);
    return null;
  }
};

// Luu hoac Cap nhat Batch vao Supabase
export const saveBatchToSupabase = async (batch: Batch): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  try {
    const dbPayload = mapBatchToDb(batch);
    const { error: batchErr } = await supabase
      .from('batches')
      .upsert(dbPayload, { onConflict: 'batch_code' });

    if (batchErr) {
      console.error('Loi upsert batch vao Supabase:', batchErr);
      return false;
    }

    // Luu danh sach checkpoints moi (khong dung delete de tuan thu RLS bat bien)
    if (batch.checkpoints && batch.checkpoints.length > 0) {
      const { data: existingRows } = await supabase
        .from('batch_history')
        .select('step_name, timestamp')
        .eq('batch_code', batch.batchCode);

      const existingSet = new Set((existingRows || []).map(r => `${r.step_name}_${r.timestamp}`));

      const newCheckpoints = batch.checkpoints.filter(
        cp => !existingSet.has(`${cp.stepName}_${cp.timestamp}`)
      );

      if (newCheckpoints.length > 0) {
        const historyPayload = newCheckpoints.map((cp) => ({
          batch_code: batch.batchCode,
          step_name: cp.stepName,
          role: cp.role,
          role_title: cp.roleTitle,
          location: cp.location,
          action: cp.action,
          timestamp: cp.timestamp,
          recorder: cp.recorder,
          metadata_uri: cp.metadataURI || '',
          tx_hash: cp.txHash || '',
          condition_note: cp.conditionNote || ''
        }));

        const { error: cpErr } = await supabase
          .from('batch_history')
          .insert(historyPayload);

        if (cpErr) {
          console.error('Loi insert batch checkpoints vao Supabase:', cpErr);
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Loi saveBatchToSupabase:', err);
    return false;
  }
};

// Them Checkpoint moi cho lo hang
export const addCheckpointToSupabase = async (
  batchCode: string,
  checkpoint: Checkpoint
): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;

  try {
    const cpPayload = {
      batch_code: batchCode,
      step_name: checkpoint.stepName,
      role: checkpoint.role,
      role_title: checkpoint.roleTitle,
      location: checkpoint.location,
      action: checkpoint.action,
      timestamp: checkpoint.timestamp,
      recorder: checkpoint.recorder,
      metadata_uri: checkpoint.metadataURI || '',
      tx_hash: checkpoint.txHash || '',
      condition_note: checkpoint.conditionNote || ''
    };

    const { error: cpErr } = await supabase.from('batch_history').insert(cpPayload);
    if (cpErr) {
      console.error('Loi them checkpoint vao Supabase:', cpErr);
      return false;
    }

    // Cap nhat currentStage cua Batch
    await supabase
      .from('batches')
      .update({
        current_stage: checkpoint.action,
        updated_at: new Date().toISOString()
      })
      .eq('batch_code', batchCode);

    return true;
  } catch (err) {
    console.error('Loi addCheckpointToSupabase:', err);
    return false;
  }
};

// Dang ky Realtime listener va tu dong kich hoat callback khi co thay doi tren Mobile/Desktop
export const subscribeToBatchesRealtime = (onChange: () => void) => {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel('realtime_batches_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'batches' },
      () => {
        onChange();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'batch_history' },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
