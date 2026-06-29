// Journey chapters — all copy lives here; never hardcoded in components.
// Chapter order drives the nav indicator, counter, and AnimatePresence key.
//
// Note: chapter switching is driven by normalized scroll progress divided evenly
// across chapter count. The original frame landmarks (chapter 01 ≈ frames 1-35,
// 02 ≈ 36-75, 03 ≈ 76-110, 04 ≈ 111-150, 05 ≈ 151-192) are reference only
// and are not read by any rendering or UI code.
export const JOURNEY = [
  {
    id:              'origin',
    chapterNumber:   '01',
    navigationTitle: 'Where It Began',
    title:           'Computer Science in India',
    body:            'My journey into software engineering began in Hyderabad, India, where I pursued a Bachelor\'s degree in Computer Science and Engineering at Mahatma Gandhi Institute of Technology. It was there that I built my foundation in algorithms, databases, operating systems, and software engineering while discovering that I genuinely enjoyed building software that solves real-world problems.',
  },
  {
    id:              'saras',
    chapterNumber:   '02',
    navigationTitle: 'Building at Scale',
    title:           'Saras Analytics',
    body:            'My first industry experience taught me what production software really means. At Saras Analytics, I designed and scaled robust Node.js microservices processing more than 10 million daily requests. Using Redis caching and circuit breakers, I reduced latency by 60% while improving peak reliability. Alongside the backend, I built React.js and Redux dashboards for exploring large-scale Snowflake datasets.',
  },
  {
    id:              'usa',
    chapterNumber:   '03',
    navigationTitle: 'A Leap Across the World',
    title:           "Master's in the United States",
    body:            'Driven by a desire to deepen my understanding of computer science, I moved to the United States to pursue a Master\'s degree in Computer Science at Stevens Institute of Technology. It was one of the biggest decisions of my life and opened the door to new opportunities, perspectives, and challenges.',
  },
  {
    id:              'stevens',
    chapterNumber:   '04',
    navigationTitle: 'Learning by Building',
    title:           'Software Engineer at Stevens',
    body:            'Alongside graduate school, I worked as a Software Engineer supporting the Mechanical Engineering Department. I built software tools, maintained computing infrastructure, and developed solutions that helped faculty and staff streamline their day-to-day operations. This experience reinforced the importance of building software that makes people\'s work easier.',
  },
  {
    id:              'today',
    chapterNumber:   '05',
    navigationTitle: 'Today',
    title:           'Building the Future with AI',
    body:            'I graduated from Stevens Institute of Technology with a perfect 4.00 GPA and earned a certificate in Databases. What excites me most today is the opportunity to build intelligent software powered by AI. Modern AI tools have fundamentally changed how I approach software engineering, making it possible to design systems that retrieve context, use tools, reason through problems, and continuously improve. Building these kinds of systems makes me feel like the possibilities are limitless.',
  },
]
