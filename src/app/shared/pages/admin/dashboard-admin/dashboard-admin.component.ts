import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService } from 'app/core/services/admin/admin.service';
import { HistoriqueService } from 'app/core/services/historique/historique.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-dashboard-admin',
  standalone: false,
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit {
  utilisateurs: any[] = [];
  historique: any[] = [];
  historiqueDashboard: any[] = [];

  formModif!: FormGroup;
  formReset!: FormGroup;

  utilisateurSelectionne: any = null;
  formulaireActif: boolean = false;
  modeForm: 'modifier' | 'reset' | null = null;

  totalUtilisateurs: number = 0;
  totalActifs: number = 0;
  totalInactifs: number = 0;

  utilisateur = {
    nom: '',
    prenom: '',
    email: '',
    role: ''
  };
  menuOuvert = false;

  modalePasswordVisible = false;
  ancienMotDePasse = '';
  nouveauMotDePasse = '';
  messageSuccess = '';
  messageErreur = '';

  constructor(
    private adminService: AdminService,
    private historiqueService: HistoriqueService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.recupererInfosUtilisateur();
    this.chargerUtilisateurs();
    this.chargerHistorique();

    this.formModif = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required]
    });

    this.formReset = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  recupererInfosUtilisateur() {
    const token = localStorage.getItem('access-token');
    if (!token) return;

    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      const decoded = JSON.parse(decodedPayload);

      this.utilisateur = {
        nom: decoded.nom || '',
        prenom: decoded.prenom || '',
        email: decoded.sub || '',
        role: decoded.scope || 'ADMIN'
      };
    } catch (e) {
      console.error('❌ Erreur de décodage du JWT :', e);
    }
  }

  ouvrirModalePassword() {
    this.modalePasswordVisible = true;
    this.messageErreur = '';
    this.messageSuccess = '';
    this.ancienMotDePasse = '';
    this.nouveauMotDePasse = '';
  }

  fermerModalePassword() {
    this.modalePasswordVisible = false;
  }

  changerMotDePasse() {
    const payload = {
      ancienPassword: this.ancienMotDePasse,
      nouveauPassword: this.nouveauMotDePasse
    };

    this.http.post('http://localhost:8085/auth/update-password', payload).subscribe({
      next: () => {
        this.messageSuccess = "✅ Mot de passe modifié avec succès.";
        this.messageErreur = "";
        this.ancienMotDePasse = '';
        this.nouveauMotDePasse = '';
      },
      error: () => {
        this.messageErreur = "❌ Ancien mot de passe incorrect.";
        this.messageSuccess = "";
      }
    });
  }

  chargerUtilisateurs() {
    this.adminService.getUtilisateurs().subscribe({
      next: (res) => {
        this.utilisateurs = res.filter(u => u.role !== null);
        this.totalUtilisateurs = this.utilisateurs.length;
        this.totalActifs = this.utilisateurs.filter(u => u.actif).length;
        this.totalInactifs = this.utilisateurs.filter(u => !u.actif).length;
      },
      error: (err) => {
        console.error('❌ Erreur chargement utilisateurs :', err);
        this.utilisateurs = [];
      }
    });
  }

  chargerHistorique() {
    this.historiqueService.getHistorique().subscribe({
      next: (data) => {
        this.historique = data;

        // 🔄 Filtrer les actions récentes (moins de 24h)
        const maintenant = new Date().getTime();
        this.historiqueDashboard = data.filter(action => {
          const dateAction = new Date(action.dateAction).getTime();
          const differenceHeures = (maintenant - dateAction) / (1000 * 60 * 60);
          return differenceHeures <= 24;
        });
      },
      error: (err) => {
        console.error('❌ Erreur chargement historique :', err);
        this.historique = [];
        this.historiqueDashboard = [];
      }
    });
  }

  ouvrirFormModification(user: any) {
    this.utilisateurSelectionne = user;
    this.modeForm = 'modifier';
    this.formulaireActif = true;

    this.formModif.patchValue({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role
    });
  }

  ouvrirFormReset(user: any) {
    this.utilisateurSelectionne = user;
    this.modeForm = 'reset';
    this.formulaireActif = true;
    this.formReset.reset();
  }

  fermerFormulaire() {
    this.formulaireActif = false;
    this.modeForm = null;
    this.utilisateurSelectionne = null;
  }

  soumettreModification() {
    if (this.formModif.invalid || !this.utilisateurSelectionne?.id) return;

    const id = this.utilisateurSelectionne.id;
    const body = this.formModif.value;

    this.adminService.modifierUtilisateur(id, body).subscribe({
      next: () => {
        this.chargerUtilisateurs();
        this.chargerHistorique();
        this.fermerFormulaire();
      },
      error: (err) => {
        console.error("❌ Erreur modification", err);
        alert("Erreur lors de la modification.");
      }
    });
  }

  soumettreReset() {
    if (this.formReset.invalid || !this.utilisateurSelectionne?.id) return;

    const id = this.utilisateurSelectionne.id;
    const newPassword = this.formReset.value.newPassword;

    this.adminService.reinitialiserMotDePasse(id, newPassword).subscribe({
      next: () => {
        alert("🔐 Mot de passe réinitialisé !");
        this.fermerFormulaire();
      },
      error: (err) => {
        console.error("❌ Erreur reset", err);
        alert("Erreur lors de la réinitialisation.");
      }
    });
  }

  toggleActivation(user: any) {
    const action = user.actif ? 'désactiver' : 'réactiver';
    if (!confirm(`Voulez-vous ${action} ${user.nom} ${user.prenom} ?`)) return;

    this.adminService.toggleActivation(user.id).subscribe({
      next: () => {
        this.chargerUtilisateurs();
        this.chargerHistorique();
      },
      error: (err) => {
        console.error('❌ Erreur activation/désactivation', err);
        alert('Erreur lors de l’opération.');
      }
    });
  }

  logout() {
    localStorage.removeItem('access-token');
    localStorage.removeItem('role');
    window.location.href = '/';
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const clickedInside = (event.target as HTMLElement).closest('.relative');
    if (!clickedInside) this.menuOuvert = false;
  }
}
