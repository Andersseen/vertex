import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { VertexFile, VertexFolder } from '@vertex/types';

interface SidecarFileItem {
  id: string;
  name: string;
  path: string;
  kind: 'file' | 'directory';
  size: number;
  modifiedAt: string;
  language?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3001/fs';

  /**
   * List files in a directory and map to VertexFolder structure
   */
  getFiles(path: string): Observable<VertexFolder> {
    return this.http.get<SidecarFileItem[]>(`${this.baseUrl}/list`, { params: { path } }).pipe(
      map((items: SidecarFileItem[]) => {
        // Find folder name from path
        const name = path.split(/[/\\]/).pop() || 'root';
        
        return {
          id: btoa(path),
          name,
          path,
          isExpanded: true,
          children: items.map(item => this.mapToVertex(item))
        } as VertexFolder;
      })
    );
  }

  /**
   * Read file content
   */
  readFile(path: string): Observable<string> {
    return this.http.get<{ content: string }>(`${this.baseUrl}/read`, { params: { path } }).pipe(
      map((res: { content: string }) => res.content)
    );
  }

  /**
   * Write file content
   */
  writeFile(path: string, content: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/write`, { path, content });
  }

  private mapToVertex(item: SidecarFileItem): VertexFile | VertexFolder {
    if (item.kind === 'directory') {
      return {
        id: item.id,
        name: item.name,
        path: item.path,
        children: [], // Lazy loaded or empty for now
        isExpanded: false
      } as VertexFolder;
    } else {
      return {
        id: item.id,
        name: item.name,
        path: item.path,
        content: '', // Content is loaded on demand
        language: item.language || 'text',
        isDirty: false
      } as VertexFile;
    }
  }
}
