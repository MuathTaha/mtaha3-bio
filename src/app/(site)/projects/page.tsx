import { getProjects } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProjectCard } from '@/components/site/ProjectCard';

export const metadata = { title: 'Projects' };
export const revalidate = 60;

export default async function ProjectsPage() {
  const projects = await getProjects();
  return (
    <Container measure="prose">
      <PageHeader
        kicker="Building"
        title="Projects"
        lede="What I've shipped — products and side-builds."
      />
      <div>
        {projects.map((p) => (
          <ProjectCard key={p._id} project={p} />
        ))}
      </div>
    </Container>
  );
}
