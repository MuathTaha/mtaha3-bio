import { getProjects } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { ProjectCard } from '@/components/site/ProjectCard';

export const metadata = { title: 'Work' };
export const revalidate = 60;

export default async function WorkPage() {
  const projects = await getProjects();
  return (
    <Container measure="prose">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Work</h1>
      <div>
        {projects.map((p) => (
          <ProjectCard key={p._id} project={p} />
        ))}
      </div>
    </Container>
  );
}
