import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getDressCodeById } from '../data/dressCodes';
import DressCodeDetail from '../components/DressCodeDetail/DressCodeDetail';

const DressCodePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dressCode = getDressCodeById(id ?? '');

  if (!dressCode) return <Navigate to="/" replace />;

  return <DressCodeDetail dressCode={dressCode} />;
};

export default DressCodePage;
