import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ActiviteService {
  private apiUrl = 'http://localhost:8085/api/activites'; // ton backend URL

  constructor(private http: HttpClient) {}

  /**
   * ✅ Récupérer toutes les activités
   */
  getAllActivites(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}`);
  }

  /**
   * ✅ Récupérer les activités d'un agent spécifique (optionnel)
   */
  getActivitesByAgent(agentId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/agent/${agentId}`);
  }
}
