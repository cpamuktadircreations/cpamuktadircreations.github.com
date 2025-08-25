import { neon } from '@netlify/neon';

export default async (req, res) => {
  const postId = req.query.id; // or from req.body or req.params
  const sql = neon();

  try {
    const [post] = await sql`SELECT * FROM posts WHERE id = ${postId}`;
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    return res.json(post);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};