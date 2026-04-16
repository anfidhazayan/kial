import { useState, useEffect } from 'react';
import CertificatesPage from '../../components/CertificatesPage';
import { entityAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const EntityCertificates = () => {
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await entityAPI.getStaff();
      setStaffList(response.data.data || []);
    } catch (err) {
      console.error('Failed to load staff list', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  if (loadingStaff) return <LoadingSpinner fullScreen />;

  return (
    <CertificatesPage
      title="Staff Certificates"
      description="Manage certificates for all your staff members"
      fetchCertificates={entityAPI.getCertificates}
      createCertificate={entityAPI.createCertificate}
      updateCertificate={entityAPI.updateCertificate}
      deleteCertificate={entityAPI.deleteCertificate}
      staffList={staffList}
      showStaffColumn={true}
    />
  );
};

export default EntityCertificates;
