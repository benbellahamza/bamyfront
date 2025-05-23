import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { RoleGuard } from './core/guards/role.guard';

// 🌐 Composants globaux
import { NavbarComponent } from './shared/components/navbar/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer/footer.component';

// 🧾 Composants Visiteurs
import { FormComponent } from './shared/pages/visiteur/form/form.component';
import { ListComponent } from './shared/pages/visiteur/list/list.component';
import { AjouterVisiteurPageComponent } from './shared/pages/visiteur/ajouter-visiteur-page/ajouter-visiteur-page.component';

// 🔐 Auth & Sécurité
import { LoginComponent } from './core/auth/login/login.component';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';

// 🚚 Composants Livraisons (structure unifiée)
import { LivraisonFormComponent } from './shared/pages/livraison/livraison-form/livraison-form.component';
import { LivraisonListComponent } from './shared/pages/livraison/livraison-list/livraison-list.component';
import { AjouterLivraisonComponent } from './shared/pages/livraison/ajouter-livraison/ajouter-livraison.component';

// 📊 Dashboards et gestion
import { DashboardAgentComponent } from './shared/pages/agent/dashboard-agent/dashboard-agent.component';
import { DashboardResponsableComponent } from './shared/pages/responsable/dashboard-responsable/dashboard-responsable.component';
import { ResponsableVisiteurComponent } from './shared/pages/responsable/responsable-visiteur/responsable-visiteur.component';
import { ResponsableLivraisonComponent } from './shared/pages/responsable/responsable-livraison/responsable-livraison.component';

// 📁 Admin - Historique & Visiteurs
import { HistoriqueActiviteComponent } from './shared/pages/admin/historique-activite/historique-activite.component';
import { AdminVisiteurComponent } from './shared/pages/admin/admin-visiteur/admin-visiteur.component';
import { AdminLivraisonComponent } from './shared/pages/admin/admin-livraison/admin-livraison.component';
import { DashboardAdminComponent } from './shared/pages/admin/dashboard-admin/dashboard-admin.component';
import { AjouterUtilisateurComponent } from './shared/pages/admin/ajouter-utilisateur/ajouter-utilisateur.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    FormComponent,
    ListComponent,
    AjouterVisiteurPageComponent,
    LoginComponent,

    // 🚚 Composants livraisons
    LivraisonFormComponent,
    LivraisonListComponent,
    AjouterLivraisonComponent,

    // 📊 Dashboards
    DashboardAgentComponent,
    DashboardAdminComponent,
    AjouterUtilisateurComponent,

    // 🧾 Responsables
    ResponsableVisiteurComponent,
    ResponsableLivraisonComponent,

    // 📁 Admin
    HistoriqueActiviteComponent,
    AdminVisiteurComponent,
    DashboardResponsableComponent,
    AdminLivraisonComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    CommonModule,
    AppRoutingModule
  ],
 providers: [
  {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true
  },
  RoleGuard // ✅ Ajout ici
],
  bootstrap: [AppComponent]
})
export class AppModule { }
