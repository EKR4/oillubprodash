import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent {
  // Company information
  companyInfo = {
    name: 'LubriPro',
    foundedYear: 2005,
    mission: 'To provide high-quality lubricants and oils that ensure peak performance and extend the life of engines and machinery.',
    vision: 'To be the leading provider of premium lubricants in East Africa, known for quality, innovation, and environmental responsibility.',
    values: [
      {
        title: 'Quality',
        description: 'We are committed to delivering products that meet or exceed industry standards and customer expectations.'
      },
      {
        title: 'Innovation',
        description: 'We continuously research and develop new formulations to address evolving industry needs.'
      },
      {
        title: 'Sustainability',
        description: 'We prioritize environmentally responsible practices in our manufacturing and product development.'
      },
      {
        title: 'Integrity',
        description: 'We conduct business with honesty, transparency, and ethical standards.'
      },
      {
        title: 'Customer Focus',
        description: 'We put our customers at the center of everything we do, providing excellent service and support.'
      }
    ],
    achievements: [
      'ISO 9001:2015 Certification for Quality Management Systems',
      'KEBS Certification for all product lines',
      'Winner of the Energy Innovation Award 2022',
      'Recognized as Top 100 Mid-Sized Companies in East Africa',
      'Zero environmental incidents for 8 consecutive years'
    ],
    milestones: [
      { year: 2005, event: 'Company founded in Nairobi, Kenya' },
      { year: 2008, event: 'Launched first synthetic oil product line' },
      { year: 2012, event: 'Expanded operations to Tanzania and Uganda' },
      { year: 2015, event: 'Built state-of-the-art manufacturing facility' },
      { year: 2018, event: 'Achieved ISO 9001:2015 certification' },
      { year: 2020, event: 'Launched eco-friendly product line' },
      { year: 2023, event: 'Introduced digital supply chain management system' }
    ],
    team: [
      {
        name: 'David Kamau',
        position: 'Chief Executive Officer',
        bio: 'With over 20 years in the petroleum industry, David brings extensive experience in operations and strategic leadership.'
      },
      {
        name: 'Grace Mwangi',
        position: 'Chief Technology Officer',
        bio: 'Grace leads our R&D team, bringing innovative solutions to market with her background in chemical engineering.'
      },
      {
        name: 'Omar Hassan',
        position: 'Chief Operations Officer',
        bio: 'Omar oversees our manufacturing and supply chain, ensuring efficient operations and quality control.'
      },
      {
        name: 'Aisha Omondi',
        position: 'Chief Financial Officer',
        bio: 'Aisha manages our financial strategy, bringing experience from both the energy and financial sectors.'
      },
      {
        name: 'James Kipchoge',
        position: 'Chief Marketing Officer',
        bio: 'James drives our brand strategy and market expansion with his innovative approach to marketing.'
      }
    ],
    facilities: [
      {
        name: 'Nairobi Manufacturing Plant',
        location: 'Industrial Area, Nairobi, Kenya',
        features: ['State-of-the-art blending facility', '24/7 production capability', 'Advanced quality testing lab', 'Storage capacity: 2 million liters']
      },
      {
        name: 'Mombasa Distribution Center',
        location: 'Port Area, Mombasa, Kenya',
        features: ['Strategic port location', 'Efficient logistics hub', 'Modern warehousing', 'Direct shipping access']
      },
      {
        name: 'Research & Development Center',
        location: 'Karen, Nairobi, Kenya',
        features: ['Advanced testing equipment', 'Collaboration with universities', 'Innovation lab', 'Environmental impact assessment']
      }
    ]
  };

  // Testimonials
    testimonials = [
    {
      name: 'John Mwenda',
      company: 'Safari Transport Ltd.',
      quote: "We've reduced our fleet maintenance costs by 30% since switching to LubriPro products. The difference in engine performance is remarkable.",
      position: 'Fleet Manager'
    },
    {
      name: 'Elizabeth Wairimu',
      company: 'Highlands Agriculture',
      quote: "Our farming equipment operates in harsh conditions, but with LubriPro lubricants, we've seen extended equipment life and fewer breakdowns.",
      position: 'Operations Director'
    },
    {
      name: 'Michael Odhiambo',
      company: 'Precision Engineering',
      quote: "The technical support and product quality from LubriPro have been exceptional. They're more than a supplier; they're a partner in our success.",
      position: 'Chief Engineer'
    }
  ];
}