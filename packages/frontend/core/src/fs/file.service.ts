import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { VertexFile, VertexFolder } from "@vertex/types";

interface SidecarFileItem {
  id: string;
  name: string;
  path: string;
  kind: "file" | "directory";
  size: number;
  modifiedAt: string;
  language?: string;
}

@Injectable({
  providedIn: "root",
})
export class FileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = "http://127.0.0.1:3001/fs";

  /**
   * List children of a directory (lazy loading)
   */
  getChildren(path: string): Observable<(VertexFile | VertexFolder)[]> {
    return this.http
      .get<SidecarFileItem[]>(`${this.baseUrl}/children`, { params: { path } })
      .pipe(
        map((items: SidecarFileItem[]) =>
          items.map((item) => this.mapToVertex(item)),
        ),
      );
  }

  /**
   * Load a full folder structure (recursive - use with caution for large folders)
   */
  getFiles(path: string): Observable<VertexFolder> {
    return this.http
      .get<SidecarFileItem[]>(`${this.baseUrl}/children`, { params: { path } })
      .pipe(
        map((items: SidecarFileItem[]) => {
          const name = path.split(/[/\\]/).pop() || "root";
          return {
            id: path,
            name,
            path,
            isExpanded: true,
            children: items.map((item) => this.mapToVertex(item)),
          } as VertexFolder;
        }),
      );
  }

  /**
   * Read file content
   */
  readFile(path: string): Observable<string> {
    return this.http
      .get<{ content: string }>(`${this.baseUrl}/read`, { params: { path } })
      .pipe(map((res: { content: string }) => res.content));
  }

  /**
   * Write file content
   */
  writeFile(path: string, content: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/write`, { path, content });
  }

  /**
   * Set/change workspace root
   * Call this when user selects a new folder to open
   */
  setWorkspace(path: string): Observable<{ success: boolean; path: string }> {
    return this.http.post<{ success: boolean; path: string }>(
      `${this.baseUrl}/workspace`,
      { path },
    );
  }

  /**
   * Get current workspace info
   */
  getWorkspace(): Observable<{ path: string; maxFileSize: number }> {
    return this.http.get<{ path: string; maxFileSize: number }>(
      `${this.baseUrl}/workspace`,
    );
  }

  private mapToVertex(item: SidecarFileItem): VertexFile | VertexFolder {
    if (item.kind === "directory") {
      return {
        id: item.id,
        name: item.name,
        path: item.path,
        children: [], // Lazy loaded or empty for now
        isExpanded: false,
      } as VertexFolder;
    } else {
      return {
        id: item.id,
        name: item.name,
        path: item.path,
        content: "", // Content is loaded on demand
        language: item.language || "text",
        isDirty: false,
      } as VertexFile;
    }
  }
}
