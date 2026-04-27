import { getProjects } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { ProjectCard } from '@/components/site/ProjectCard';

export const metadata = { title: 'Projects' };
export const revalidate = 60;

export default async function ProjectsPage() {
  const projects = await getProjects();
  return (
    <Container measure="prose">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Projects</h1>
      <p className="mb-10 text-[var(--color-fg-muted)]">
        What I've shipped — products and side-builds.
      </p>
      <div>
        {projects.map((p) => (
          <ProjectCard key={p._id} project={p} />
        ))}
      </div>
    </Container>
  );
}
