import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

@Injectable({
  providedIn: 'root'
})
export class TauriService {
  /**
   * Open native folder selection dialog
   * Returns the selected path or null if cancelled
   */
  async selectFolder(): Promise<string | null> {
    try {
      // Calls the select_folder command implemented in lib.rs
      return await invoke<string | null>('select_folder');
    } catch (error) {
      console.error('Error selecting folder:', error);
      return null;
    }
  }
}
